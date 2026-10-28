import { db } from "@/db";
import { participants, classSessions, checkIns } from "@/db/schema";
import { and, eq, inArray, isNull, not, sql } from "drizzle-orm";
import { FunnelChart } from "./FunnelChart";
import { abbrev } from "../sessionLabel";

export async function FunnelResults({
  batchId,
  batchName,
  excludeWaterBaptism,
  excludeOrientation,
  lockedServiceRawValues,
}: {
  batchId: number;
  batchName: string;
  excludeWaterBaptism: boolean;
  excludeOrientation: boolean;
  lockedServiceRawValues?: string[];
}) {
  // The participant classes of the batch: VGL-only sessions record VG leaders, not
  // participants, so they never belong in the funnel; Water Baptism and Orientation are
  // optional to leave out.
  const funnelSession = and(
    eq(classSessions.batchId, batchId),
    eq(classSessions.vglOnly, false),
    excludeWaterBaptism ? not(sql`${classSessions.name} ilike '%water baptism%'`) : undefined,
    excludeOrientation ? not(sql`${classSessions.name} ilike '%orientation%'`) : undefined
  );

  const qualifiedParticipant = and(
    isNull(participants.deletedAt),
    eq(participants.isWalkIn, false),
    eq(participants.batchId, batchId),
    lockedServiceRawValues ? inArray(participants.serviceAttending, lockedServiceRawValues) : undefined
  );

  const [sessionRows, pRows] = await Promise.all([
    // Attendance for each specific session, restricted to qualifying
    // participants — this is the same "how many attended THIS session"
    // metric shown on the Sessions page, not a total-count histogram.
    db
      .select({
        name: classSessions.name,
        isVictoryDay: classSessions.isVictoryDay,
        count: sql<number>`COUNT(DISTINCT ${participants.id})::int`,
        // Marked Absent for arriving 15+ minutes late — they still attended, so they stay in
        // `count` and only show in red on the chart.
        absent: sql<number>`(COUNT(DISTINCT ${participants.id}) FILTER (WHERE ${checkIns.status} = 'Absent'))::int`,
      })
      .from(classSessions)
      .leftJoin(checkIns, eq(checkIns.classSessionId, classSessions.id))
      .leftJoin(participants, and(eq(participants.id, checkIns.participantId), qualifiedParticipant))
      .where(funnelSession)
      .groupBy(classSessions.id, classSessions.name, classSessions.isVictoryDay)
      .orderBy(classSessions.sessionDate, classSessions.id),

    // Per-participant sessions attended, used only for the "No Sessions Yet / In Progress /
    // Completed All" summary cards. Same rule as Attendance Per Discipleship Journey's
    // "Attended all": a check-in marked Absent isn't attending, and fee categories C/D (who
    // already had their Victory Day) don't need the Victory Day sessions.
    db
      .select({
        id: participants.id,
        registrationFee: participants.registrationFee,
        attended: sql<number>`(COUNT(DISTINCT ${classSessions.id}) FILTER (WHERE ${checkIns.status} <> 'Absent'))::int`,
        attendedVictoryDay: sql<number>`(COUNT(DISTINCT ${classSessions.id}) FILTER (WHERE ${checkIns.status} <> 'Absent' AND ${classSessions.isVictoryDay}))::int`,
      })
      .from(participants)
      .leftJoin(checkIns, eq(checkIns.participantId, participants.id))
      .leftJoin(classSessions, and(eq(classSessions.id, checkIns.classSessionId), funnelSession))
      .where(qualifiedParticipant)
      .groupBy(participants.id),
  ]);

  const totalSessions = sessionRows.length;
  const victoryDaySessions = sessionRows.filter((s) => s.isVictoryDay).length;
  const registrantCount = pRows.length;
  const noneCount = pRows.filter((p) => p.attended === 0).length;
  const completeCount = pRows.filter((p) => {
    const skipsVictoryDay = p.registrationFee === "C" || p.registrationFee === "D";
    const required = skipsVictoryDay ? totalSessions - victoryDaySessions : totalSessions;
    const attended = skipsVictoryDay ? p.attended - p.attendedVictoryDay : p.attended;
    return required > 0 && attended === required;
  }).length;
  const partialCount = registrantCount - noneCount - completeCount;

  const funnelData = sessionRows.map((s, idx) => ({
    sessions: idx + 1,
    label: idx + 1 === totalSessions ? `${abbrev(s.name)} ✓` : abbrev(s.name),
    count: s.count,
    present: s.count - s.absent,
    absent: s.absent,
    total: totalSessions,
    sessionName: s.name,
  }));

  return (
    <>
      <p className="text-sm text-gray-500 -mt-3">
        {registrantCount} participant{registrantCount !== 1 ? "s" : ""} · {totalSessions} session{totalSessions !== 1 ? "s" : ""} in {batchName}
      </p>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "No Sessions Yet", value: noneCount, color: "text-red-500" },
          { label: "In Progress", value: partialCount, color: "text-indigo-500" },
          { label: "Completed All", value: completeCount, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {registrantCount > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {Math.round((value / registrantCount) * 100)}% of participants
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">
          Participants by sessions attended
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Attendance per session, in order · ✓ = final session ·{" "}
          <span className="text-red-500">red</span> = marked Absent (came 15+ min late), still counted
        </p>
        <FunnelChart data={funnelData} />
      </div>
    </>
  );
}

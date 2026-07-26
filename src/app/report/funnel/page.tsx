import { db } from "@/db";
import { participants, classSessions, checkIns, batches } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FunnelChart } from "./FunnelChart";
import { BatchPicker } from "../BatchPicker";

export default async function FunnelReportPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");

  const { batch: batchParam } = await searchParams;

  const allBatches = await db
    .select({ id: batches.id, name: batches.name, isDefault: batches.isDefault })
    .from(batches)
    .orderBy(batches.createdAt);

  const defaultBatch = allBatches.find((b) => b.isDefault) ?? allBatches[0] ?? null;
  const selectedBatchId = batchParam ? parseInt(batchParam, 10) : (defaultBatch?.id ?? null);
  const selectedBatch = allBatches.find((b) => b.id === selectedBatchId) ?? null;

  let totalSessions = 0;
  let registrantCount = 0;
  let noneCount = 0;
  let completeCount = 0;
  let sessionAttendance: { name: string; count: number }[] = [];

  if (selectedBatchId !== null) {
    const qualifiedParticipant = and(
      isNull(participants.deletedAt),
      eq(participants.isWalkIn, false),
      eq(participants.batchId, selectedBatchId)
    );

    const [sessionRows, pRows] = await Promise.all([
      // Attendance for each specific session, restricted to qualifying
      // participants — this is the same "how many attended THIS session"
      // metric shown on the Sessions page, not a total-count histogram.
      db
        .select({
          name: classSessions.name,
          count: sql<number>`COUNT(DISTINCT ${participants.id})::int`,
        })
        .from(classSessions)
        .leftJoin(checkIns, eq(checkIns.classSessionId, classSessions.id))
        .leftJoin(participants, and(eq(participants.id, checkIns.participantId), qualifiedParticipant))
        .where(eq(classSessions.batchId, selectedBatchId))
        .groupBy(classSessions.id, classSessions.name)
        .orderBy(classSessions.sessionDate, classSessions.id),

      // Per-participant total distinct sessions attended, used only for the
      // "No Sessions Yet / In Progress / Completed All" summary cards.
      db
        .select({
          id: participants.id,
          checkInCount: sql<number>`COUNT(${classSessions.id})::int`,
        })
        .from(participants)
        .leftJoin(checkIns, eq(checkIns.participantId, participants.id))
        .leftJoin(
          classSessions,
          and(
            eq(classSessions.id, checkIns.classSessionId),
            eq(classSessions.batchId, selectedBatchId)
          )
        )
        .where(qualifiedParticipant)
        .groupBy(participants.id),
    ]);

    sessionAttendance = sessionRows;
    totalSessions = sessionRows.length;
    registrantCount = pRows.length;
    noneCount = pRows.filter((p) => p.checkInCount === 0).length;
    completeCount = pRows.filter((p) => p.checkInCount === totalSessions).length;
  }

  const partialCount = registrantCount - noneCount - completeCount;

  const funnelData = [
    { sessions: 0, label: "0", count: noneCount, total: totalSessions, sessionName: null as string | null },
    ...sessionAttendance.map((s, idx) => ({
      sessions: idx + 1,
      label: idx + 1 === totalSessions ? `${idx + 1} ✓` : String(idx + 1),
      count: s.count,
      total: totalSessions,
      sessionName: s.name,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Reports", href: "/report" },
            { label: "Completion Funnel" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Completion Funnel</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {registrantCount} participant{registrantCount !== 1 ? "s" : ""} · {totalSessions} session{totalSessions !== 1 ? "s" : ""} in {selectedBatch?.name ?? "—"}
        </p>
      </div>

      <BatchPicker batches={allBatches} selectedId={selectedBatchId} />

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
          0 = no sessions yet · bars 1–{totalSessions} = attendance per session, in order · ✓ = final session
        </p>
        <FunnelChart data={funnelData} />
      </div>
    </div>
  );
}

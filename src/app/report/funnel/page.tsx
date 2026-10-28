import { db } from "@/db";
import { participants, classSessions, checkIns, batches } from "@/db/schema";
import { and, eq, inArray, isNull, not, sql } from "drizzle-orm";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FunnelChart } from "./FunnelChart";
import { BatchPicker } from "@/components/BatchPicker";
import { rawServiceValues } from "@/lib/timeService";

export default async function FunnelReportPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; waterBaptism?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");
  const lockedServiceRawValues =
    authSession.role === "lead_pastor" ? rawServiceValues(authSession.timeService) : undefined;

  const { batch: batchParam, waterBaptism } = await searchParams;
  const excludeWaterBaptism = waterBaptism === "exclude";

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
  let sessionAttendance: { name: string; count: number; absent: number }[] = [];

  if (selectedBatchId !== null) {
    // The participant classes of the batch: VGL-only sessions record VG leaders, not
    // participants, so they never belong in the funnel; Water Baptism is optional to leave out.
    const funnelSession = and(
      eq(classSessions.batchId, selectedBatchId),
      eq(classSessions.vglOnly, false),
      excludeWaterBaptism ? not(sql`${classSessions.name} ilike '%water baptism%'`) : undefined
    );

    const qualifiedParticipant = and(
      isNull(participants.deletedAt),
      eq(participants.isWalkIn, false),
      eq(participants.batchId, selectedBatchId),
      lockedServiceRawValues ? inArray(participants.serviceAttending, lockedServiceRawValues) : undefined
    );

    const [sessionRows, pRows] = await Promise.all([
      // Attendance for each specific session, restricted to qualifying
      // participants — this is the same "how many attended THIS session"
      // metric shown on the Sessions page, not a total-count histogram.
      db
        .select({
          name: classSessions.name,
          count: sql<number>`COUNT(DISTINCT ${participants.id})::int`,
          // Marked Absent for arriving 15+ minutes late — they still attended, so they stay in
          // `count` and only show in red on the chart.
          absent: sql<number>`(COUNT(DISTINCT ${participants.id}) FILTER (WHERE ${checkIns.status} = 'Absent'))::int`,
        })
        .from(classSessions)
        .leftJoin(checkIns, eq(checkIns.classSessionId, classSessions.id))
        .leftJoin(participants, and(eq(participants.id, checkIns.participantId), qualifiedParticipant))
        .where(funnelSession)
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
        .leftJoin(classSessions, and(eq(classSessions.id, checkIns.classSessionId), funnelSession))
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

  const funnelData = sessionAttendance.map((s, idx) => ({
    sessions: idx + 1,
    label: idx + 1 === totalSessions ? `${idx + 1} ✓` : String(idx + 1),
    count: s.count,
    present: s.count - s.absent,
    absent: s.absent,
    total: totalSessions,
    sessionName: s.name,
  }));

  const toggleHref = (() => {
    const params = new URLSearchParams();
    if (batchParam) params.set("batch", batchParam);
    if (!excludeWaterBaptism) params.set("waterBaptism", "exclude");
    const qs = params.toString();
    return `/report/funnel${qs ? `?${qs}` : ""}`;
  })();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Discipleship Journey Portal", href: "/journey" },
            { label: "Reports", href: "/report" },
            { label: "Completion Funnel" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Completion Funnel</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {registrantCount} participant{registrantCount !== 1 ? "s" : ""} · {totalSessions} session{totalSessions !== 1 ? "s" : ""} in {selectedBatch?.name ?? "—"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <BatchPicker batches={allBatches} selectedId={selectedBatchId} />
        <Link
          href={toggleHref}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
            excludeWaterBaptism
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
              excludeWaterBaptism ? "border-indigo-500 bg-indigo-500 text-white" : "border-gray-300 bg-white"
            }`}
          >
            {excludeWaterBaptism ? "✓" : ""}
          </span>
          Exclude Water Baptism
        </Link>
      </div>

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
          Bars 1–{totalSessions} = attendance per session, in order · ✓ = final session ·{" "}
          <span className="text-red-500">red</span> = marked Absent (came 15+ min late), still counted
        </p>
        <FunnelChart data={funnelData} />
      </div>
    </div>
  );
}

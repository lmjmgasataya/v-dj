import { db } from "@/db";
import { participants, classSessions, checkIns, batches } from "@/db/schema";
import { and, eq, exists, isNull, sql } from "drizzle-orm";
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
  let participantRows: { id: number; checkInCount: number }[] = [];

  if (selectedBatchId !== null) {
    const [totalResult, pRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(classSessions)
        .where(eq(classSessions.batchId, selectedBatchId)),

      db
        .select({
          id: participants.id,
          checkInCount: sql<number>`COUNT(${checkIns.id})::int`,
        })
        .from(participants)
        .leftJoin(
          checkIns,
          and(
            eq(checkIns.participantId, participants.id),
            exists(
              db
                .select({ one: sql`1` })
                .from(classSessions)
                .where(
                  and(
                    eq(classSessions.id, checkIns.classSessionId),
                    eq(classSessions.batchId, selectedBatchId)
                  )
                )
            )
          )
        )
        .where(
          and(
            isNull(participants.deletedAt),
            eq(participants.isWalkIn, false),
            eq(participants.batchId, selectedBatchId)
          )
        )
        .groupBy(participants.id),
    ]);

    totalSessions = totalResult[0].count;
    participantRows = pRows;
  }

  const distribution = new Map<number, number>();
  for (const p of participantRows) {
    const attended = p.checkInCount;
    distribution.set(attended, (distribution.get(attended) ?? 0) + 1);
  }

  const registrantCount = participantRows.length;

  const funnelData = Array.from({ length: totalSessions + 1 }, (_, i) => ({
    sessions: i,
    label: i === totalSessions ? `${i} ✓` : String(i),
    count: distribution.get(i) ?? 0,
    total: totalSessions,
  }));

  const noneCount = distribution.get(0) ?? 0;
  const completeCount = distribution.get(totalSessions) ?? 0;
  const partialCount = registrantCount - noneCount - completeCount;

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
          X-axis = number of sessions attended · ✓ = completed all {totalSessions}
        </p>
        <FunnelChart data={funnelData} />
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { db } from "@/db";
import { classSessions, batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BatchPicker } from "@/components/BatchPicker";
import { SessionPicker } from "./SessionPicker";
import { TablesResults } from "./TablesResults";
import { TablesResultsSkeleton } from "./TablesResultsSkeleton";

export default async function TableAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; session?: string }>;
}) {
  const { batch: batchParam, session: sessionParam } = await searchParams;
  const selectedId = sessionParam ? parseInt(sessionParam, 10) : null;

  const allBatches = await db
    .select({ id: batches.id, name: batches.name, isDefault: batches.isDefault })
    .from(batches)
    .orderBy(batches.createdAt);

  const defaultBatch = allBatches.find((b) => b.isDefault) ?? allBatches[0] ?? null;
  const selectedBatchId = batchParam ? parseInt(batchParam, 10) : (defaultBatch?.id ?? null);

  const sessions =
    selectedBatchId !== null
      ? await db
          .select({
            id: classSessions.id,
            name: classSessions.name,
            sessionDate: classSessions.sessionDate,
          })
          .from(classSessions)
          .where(eq(classSessions.batchId, selectedBatchId))
          .orderBy(classSessions.sessionDate, classSessions.id)
      : [];

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <BatchPicker batches={allBatches} selectedId={selectedBatchId} />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Session
        </label>
        <SessionPicker sessions={sessions} selectedId={selectedId} />
      </div>

      {selectedSession ? (
        <Suspense key={selectedSession.id} fallback={<TablesResultsSkeleton />}>
          <TablesResults sessionId={selectedSession.id} />
        </Suspense>
      ) : (
        <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
          Select a session above to view its table assignments.
        </div>
      )}
    </div>
  );
}

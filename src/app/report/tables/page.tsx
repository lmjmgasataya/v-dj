import { Suspense } from "react";
import { db } from "@/db";
import { classSessions, batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionPicker } from "./SessionPicker";
import { TablesResults } from "./TablesResults";
import { TablesResultsSkeleton } from "./TablesResultsSkeleton";
import { BatchPicker } from "../BatchPicker";

export default async function TablesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; session?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");

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
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Reports", href: "/report" },
            { label: "Table Assignments" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Table Assignments</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Who&rsquo;s seated at which table for a given session
        </p>
      </div>

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

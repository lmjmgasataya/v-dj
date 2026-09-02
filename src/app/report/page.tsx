import { db } from "@/db";
import { classSessions, batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AttendanceSearch } from "./AttendanceSearch";
import { AttendanceTable, TableSkeleton } from "./AttendanceTable";
import { BatchPicker } from "@/components/BatchPicker";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; q?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");

  const { batch: batchParam, q = "" } = await searchParams;
  const query = q.trim();

  const allBatches = await db
    .select({ id: batches.id, name: batches.name, isDefault: batches.isDefault })
    .from(batches)
    .orderBy(batches.createdAt);

  const defaultBatch = allBatches.find((b) => b.isDefault) ?? allBatches[0] ?? null;
  const selectedBatchId = batchParam ? parseInt(batchParam, 10) : (defaultBatch?.id ?? null);
  const selectedBatch = allBatches.find((b) => b.id === selectedBatchId) ?? null;

  const sessions =
    selectedBatchId !== null
      ? await db
          .select()
          .from(classSessions)
          .where(eq(classSessions.batchId, selectedBatchId))
          .orderBy(classSessions.sessionDate, classSessions.id)
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Discipleship Journey Portal", href: "/journey" }, { label: "Attendance Report" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Attendance Report</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} in{" "}
          {selectedBatch?.name ?? "—"}
        </p>
      </div>

      <BatchPicker batches={allBatches} selectedId={selectedBatchId} />

      <AttendanceSearch />

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-400">No sessions for this batch.</p>
      ) : !query ? (
        <p className="text-sm text-gray-400">Type a name above to search participants.</p>
      ) : (
        <Suspense key={`${selectedBatchId}-${query}`} fallback={<TableSkeleton sessions={sessions} />}>
          <AttendanceTable batchId={selectedBatchId!} query={query} sessions={sessions} />
        </Suspense>
      )}
    </div>
  );
}

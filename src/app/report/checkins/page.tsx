import { db } from "@/db";
import { classSessions, checkIns, batches } from "@/db/schema";
import { count, eq, max, min, sql } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionPicker } from "./SessionPicker";
import { CheckInsChart } from "./CheckInsChart";
import { BatchPicker } from "../BatchPicker";

export default async function CheckInsReportPage({
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

  let buckets: { time: string; count: number }[] = [];
  let stats: { total: number; first: string | null; last: string | null; peak: string | null } = {
    total: 0,
    first: null,
    last: null,
    peak: null,
  };

  if (selectedSession) {
    const [bucketRows, summaryRows] = await Promise.all([
      db
        .select({
          time: sql<string>`to_char(
            date_trunc('hour', ${checkIns.checkedInAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') +
            floor(extract(minute from ${checkIns.checkedInAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') / 15) * interval '15 minutes',
            'HH12:MI AM'
          )`,
          sortKey: sql<string>`date_trunc('hour', ${checkIns.checkedInAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') +
            floor(extract(minute from ${checkIns.checkedInAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') / 15) * interval '15 minutes'`,
          count: count(),
        })
        .from(checkIns)
        .where(eq(checkIns.classSessionId, selectedSession.id))
        .groupBy(sql`1, 2`)
        .orderBy(sql`2`),

      db
        .select({
          total: count(),
          first: min(checkIns.checkedInAt),
          last: max(checkIns.checkedInAt),
        })
        .from(checkIns)
        .where(eq(checkIns.classSessionId, selectedSession.id)),
    ]);

    buckets = bucketRows.map((r) => ({ time: r.time, count: r.count }));

    const peakBucket = bucketRows.reduce(
      (best, r) => (r.count > (best?.count ?? 0) ? r : best),
      null as (typeof bucketRows)[number] | null
    );

    const fmt = (d: Date | null) =>
      d
        ? new Date(d).toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          })
        : null;

    stats = {
      total: summaryRows[0]?.total ?? 0,
      first: fmt(summaryRows[0]?.first ?? null),
      last: fmt(summaryRows[0]?.last ?? null),
      peak: peakBucket ? `${peakBucket.time} (${peakBucket.count})` : null,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Reports", href: "/report" },
            { label: "Check-in Times" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Check-in Times</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Distribution of check-in times per session
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
        <>
          {stats.total > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Check-ins", value: stats.total },
                { label: "First Check-in", value: stats.first ?? "—" },
                { label: "Last Check-in", value: stats.last ?? "—" },
                { label: "Busiest Window", value: stats.peak ?? "—" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4"
                >
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    {label}
                  </p>
                  <p className="text-xl font-bold text-indigo-600 mt-1">{value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Check-ins by 15-minute window
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Filled dot = peak window
            </p>
            <CheckInsChart data={buckets} />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
          Select a session above to view its check-in time distribution.
        </div>
      )}
    </div>
  );
}

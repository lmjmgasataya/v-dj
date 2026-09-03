import { db } from "@/db";
import { vgReportSnapshots, vgConvergenceAttendance, leadership113Batches } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { SERVICE_BUCKETS, type VgSnapshotData, type VgServiceBucket, type VgBucketDetail } from "@/lib/vgSnapshot";
import { computeVgSnapshotCounts } from "@/lib/vgSnapshotCompute";
import { SnapshotForm, SnapshotListItem } from "./SnapshotForm";
import { ConvergenceSection } from "./ConvergenceSection";
import { Leadership113Section } from "./Leadership113Section";
import { ComparisonPicker } from "./ComparisonPicker";
import { DrillDownValue } from "./DrillDownValue";

function detailItems(detail: VgBucketDetail | undefined, key: keyof VgSnapshotData["totals"]): string[] | null {
  if (!detail) return null;
  if (key === "vgLeaders") return detail.vgLeaders.map((r) => r.name);
  if (key === "leadershipGroups") return detail.leadershipGroups.map((r) => r.name);
  if (key === "victoryGroups") return detail.victoryGroups.map((r) => r.label);
  return detail.interns;
}

function ChangeCell({ diff }: { diff: number }) {
  if (diff === 0) return <span className="text-gray-400">–</span>;
  return (
    <span className={diff > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
      {diff > 0 ? `+${diff}` : diff}
    </span>
  );
}

function RowsTable({
  title,
  rows,
  latest,
  previous,
}: {
  title: string;
  rows: { label: string; value: number; prev: number | null; bold?: boolean; detail?: string[] | null; prevDetail?: string[] | null }[];
  latest: { label: string; data: VgSnapshotData };
  previous: { label: string; data: VgSnapshotData } | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left font-medium" />
              <th className="px-4 py-2 text-left font-medium">{latest.label}</th>
              {previous && <th className="px-4 py-2 text-left font-medium">{previous.label}</th>}
              {previous && <th className="px-4 py-2 text-left font-medium">Change</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.label} className={row.bold ? "bg-gray-50 font-semibold" : "hover:bg-gray-50"}>
                <td className="px-4 py-2.5 text-gray-700">{row.label}</td>
                <td className="px-4 py-2.5 text-gray-900">
                  <DrillDownValue value={row.value} items={row.detail} />
                </td>
                {previous && (
                  <td className="px-4 py-2.5 text-gray-500">
                    <DrillDownValue value={row.prev ?? 0} items={row.prevDetail} />
                  </td>
                )}
                {previous && (
                  <td className="px-4 py-2.5">
                    <ChangeCell diff={row.value - (row.prev ?? 0)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const METRIC_LABELS: { label: string; key: keyof VgSnapshotData["totals"] }[] = [
  { label: "VG Leaders", key: "vgLeaders" },
  { label: "Victory Groups", key: "victoryGroups" },
  { label: "Interns", key: "interns" },
  { label: "Leadership Group Leaders", key: "leadershipGroups" },
];

function MetricsTotalsTable({
  latest,
  previous,
}: {
  latest: { label: string; data: VgSnapshotData };
  previous: { label: string; data: VgSnapshotData } | null;
}) {
  const rows = METRIC_LABELS.map((m) => ({
    label: m.label,
    value: latest.data.totals[m.key],
    prev: previous ? previous.data.totals[m.key] : null,
    detail: detailItems(latest.data.totalsDetail, m.key),
    prevDetail: previous ? detailItems(previous.data.totalsDetail, m.key) : null,
  }));

  return <RowsTable title="Number of Leaders" rows={rows} latest={latest} previous={previous} />;
}

function CountsTable({
  title,
  metric,
  latest,
  previous,
}: {
  title: string;
  metric: keyof VgSnapshotData["totals"];
  latest: { label: string; data: VgSnapshotData };
  previous: { label: string; data: VgSnapshotData } | null;
}) {
  const rows = [
    ...SERVICE_BUCKETS.map((bucket) => ({
      label: bucket,
      value: latest.data.byService[bucket][metric],
      prev: previous ? previous.data.byService[bucket][metric] : null,
      detail: detailItems(latest.data.detailsByService?.[bucket], metric),
      prevDetail: previous ? detailItems(previous.data.detailsByService?.[bucket], metric) : null,
    })),
    {
      label: "TOTAL",
      value: latest.data.totals[metric],
      prev: previous ? previous.data.totals[metric] : null,
      bold: true,
      detail: detailItems(latest.data.totalsDetail, metric),
      prevDetail: previous ? detailItems(previous.data.totalsDetail, metric) : null,
    },
  ];

  return <RowsTable title={title} rows={rows} latest={latest} previous={previous} />;
}

function PerBucketTable({
  bucket,
  latest,
  previous,
}: {
  bucket: VgServiceBucket;
  latest: { label: string; data: VgSnapshotData };
  previous: { label: string; data: VgSnapshotData } | null;
}) {
  const metrics: { label: string; key: keyof VgSnapshotData["totals"] }[] = [
    { label: "VG Leaders", key: "vgLeaders" },
    { label: "Victory Groups", key: "victoryGroups" },
    { label: "Interns", key: "interns" },
    { label: "Leadership Group Leaders", key: "leadershipGroups" },
  ];

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="font-semibold text-white">{bucket}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-xs text-gray-300 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left font-medium" />
              <th className="px-4 py-2 text-left font-medium">{latest.label}</th>
              {previous && <th className="px-4 py-2 text-left font-medium">{previous.label}</th>}
              {previous && <th className="px-4 py-2 text-left font-medium">Change</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {metrics.map((m) => {
              const value = latest.data.byService[bucket][m.key];
              const prev = previous ? previous.data.byService[bucket][m.key] : null;
              const detail = detailItems(latest.data.detailsByService?.[bucket], m.key);
              const prevDetail = previous ? detailItems(previous.data.detailsByService?.[bucket], m.key) : null;
              return (
                <tr key={m.key}>
                  <td className="px-4 py-2.5 text-gray-200">{m.label}</td>
                  <td className="px-4 py-2.5 text-white font-semibold">
                    <DrillDownValue value={value} items={detail} />
                  </td>
                  {previous && (
                    <td className="px-4 py-2.5 text-gray-400">
                      <DrillDownValue value={prev ?? 0} items={prevDetail} />
                    </td>
                  )}
                  {previous && (
                    <td className="px-4 py-2.5">
                      <ChangeCell diff={value - (prev ?? 0)} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function QuarterlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const [{ a: aParam, b: bParam }, snapshots, convergenceEntries, batches, liveCounts, session] = await Promise.all([
    searchParams,
    db.select().from(vgReportSnapshots).orderBy(desc(vgReportSnapshots.asOfDate)),
    db.select().from(vgConvergenceAttendance).orderBy(asc(vgConvergenceAttendance.eventDate)),
    db.select().from(leadership113Batches).orderBy(asc(leadership113Batches.id)),
    computeVgSnapshotCounts(),
    getSession(),
  ]);

  const canEdit = session?.role === "developer";

  const live = { label: "Live Now", data: { ...liveCounts, goals: { vgLeaders: 0, leadershipGroups: 0 } } };

  const aId = aParam ? parseInt(aParam, 10) : null;
  const bId = bParam ? parseInt(bParam, 10) : null;

  const latestRow = (aId != null ? snapshots.find((s) => s.id === aId) : null) ?? snapshots[0];
  const latestIndex = latestRow ? snapshots.findIndex((s) => s.id === latestRow.id) : -1;
  const previousRow = bParam !== undefined
    ? (bId != null ? snapshots.find((s) => s.id === bId) ?? null : null)
    : (snapshots[latestIndex + 1] ?? null);

  const latest = latestRow ? { label: latestRow.label, data: latestRow.data as VgSnapshotData } : null;
  const previous = previousRow ? { label: previousRow.label, data: previousRow.data as VgSnapshotData } : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Quarterly Discipleship Report</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Each snapshot captures a point-in-time count. Save one at the end of every quarter to get quarter-over-quarter comparisons below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {snapshots.length > 0 && (
            <ComparisonPicker
              snapshots={snapshots.map((s) => ({ id: s.id, label: s.label }))}
              aId={latestRow!.id}
              bId={previousRow?.id ?? null}
            />
          )}
          {latest && (
            <a
              href={`/api/report/quarterly-pdf?a=${latestRow!.id}${previousRow ? `&b=${previousRow.id}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-white bg-[#00428E] hover:bg-[#003578] px-3 py-1.5 rounded-lg transition"
            >
              Export PDF
            </a>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4">
          <SnapshotForm />
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-sm font-semibold text-green-800">Live Now</p>
        </div>
        <MetricsTotalsTable latest={live} previous={null} />
      </div>

      {!latest ? (
        <p className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-8 text-sm text-gray-400 text-center">
          No snapshots yet. Create one above to start tracking quarter-over-quarter numbers.
        </p>
      ) : (
        <>
          <MetricsTotalsTable latest={latest} previous={previous} />

          <CountsTable title="Number of VG Leaders" metric="vgLeaders" latest={latest} previous={previous} />
          <CountsTable title="Number of Victory Groups" metric="victoryGroups" latest={latest} previous={previous} />
          <CountsTable title="Number of Interns" metric="interns" latest={latest} previous={previous} />
          <CountsTable title="Number of Leadership Group Leaders" metric="leadershipGroups" latest={latest} previous={previous} />

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{latest.label} VGL (per gender)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium" />
                    <th className="px-4 py-2 text-left font-medium">Male</th>
                    <th className="px-4 py-2 text-left font-medium">Female</th>
                    <th className="px-4 py-2 text-left font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {SERVICE_BUCKETS.map((bucket) => (
                    <tr key={bucket} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{bucket}</td>
                      <td className="px-4 py-2.5 text-gray-500">{latest.data.vglByGender[bucket].male}</td>
                      <td className="px-4 py-2.5 text-gray-500">{latest.data.vglByGender[bucket].female}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-semibold">{latest.data.byService[bucket].vgLeaders}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-2.5 text-gray-700">TOTAL</td>
                    <td className="px-4 py-2.5">{latest.data.genderTotals.male}</td>
                    <td className="px-4 py-2.5">{latest.data.genderTotals.female}</td>
                    <td className="px-4 py-2.5">{latest.data.totals.vgLeaders}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{latest.label} Goals</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">VG Leaders</p>
                <p className="text-lg font-bold text-gray-900">
                  {latest.data.totals.vgLeaders} <span className="text-gray-400 text-sm font-normal">/ {latest.data.goals.vgLeaders}</span>
                </p>
                <p className="text-xs text-red-500">
                  {latest.data.totals.vgLeaders - latest.data.goals.vgLeaders < 0
                    ? `${latest.data.totals.vgLeaders - latest.data.goals.vgLeaders}`
                    : `+${latest.data.totals.vgLeaders - latest.data.goals.vgLeaders}`}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Leadership Group Leaders</p>
                <p className="text-lg font-bold text-gray-900">
                  {latest.data.totals.leadershipGroups} <span className="text-gray-400 text-sm font-normal">/ {latest.data.goals.leadershipGroups}</span>
                </p>
                <p className="text-xs text-red-500">
                  {latest.data.totals.leadershipGroups - latest.data.goals.leadershipGroups < 0
                    ? `${latest.data.totals.leadershipGroups - latest.data.goals.leadershipGroups}`
                    : `+${latest.data.totals.leadershipGroups - latest.data.goals.leadershipGroups}`}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Data per Service Time</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVICE_BUCKETS.map((bucket) => (
                <PerBucketTable key={bucket} bucket={bucket} latest={latest} previous={previous} />
              ))}
            </div>
          </div>
        </>
      )}

      <ConvergenceSection entries={convergenceEntries} canEdit={canEdit} />
      <Leadership113Section batches={batches} canEdit={canEdit} />

      {snapshots.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Saved Snapshots</h3>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {snapshots.map((s) => <SnapshotListItem key={s.id} snapshot={s} canEdit={canEdit} />)}
          </div>
        </div>
      )}
    </div>
  );
}

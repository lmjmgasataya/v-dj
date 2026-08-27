import { db } from "@/db";
import { vgReportSnapshots, vgConvergenceAttendance, leadership113Batches } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import { SERVICE_BUCKETS, type VgSnapshotData, type VgServiceBucket } from "@/lib/vgSnapshot";
import { SnapshotForm, SnapshotListItem } from "./SnapshotForm";
import { ConvergenceSection } from "./ConvergenceSection";
import { Leadership113Section } from "./Leadership113Section";

function ChangeCell({ diff }: { diff: number }) {
  if (diff === 0) return <span className="text-gray-400">–</span>;
  return (
    <span className={diff > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
      {diff > 0 ? `+${diff}` : diff}
    </span>
  );
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
  const rows: { label: string; value: number; prev: number | null }[] = [
    ...SERVICE_BUCKETS.map((bucket) => ({
      label: bucket,
      value: latest.data.byService[bucket][metric],
      prev: previous ? previous.data.byService[bucket][metric] : null,
    })),
    {
      label: "TOTAL",
      value: latest.data.totals[metric],
      prev: previous ? previous.data.totals[metric] : null,
    },
  ];

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
              <tr key={row.label} className={row.label === "TOTAL" ? "bg-gray-50 font-semibold" : "hover:bg-gray-50"}>
                <td className="px-4 py-2.5 text-gray-700">{row.label}</td>
                <td className="px-4 py-2.5 text-gray-900">{row.value}</td>
                {previous && <td className="px-4 py-2.5 text-gray-500">{row.prev}</td>}
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
              return (
                <tr key={m.key}>
                  <td className="px-4 py-2.5 text-gray-200">{m.label}</td>
                  <td className="px-4 py-2.5 text-white font-semibold">{value}</td>
                  {previous && <td className="px-4 py-2.5 text-gray-400">{prev}</td>}
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

export default async function QuarterlyReportPage() {
  const [snapshots, convergenceEntries, batches] = await Promise.all([
    db.select().from(vgReportSnapshots).orderBy(desc(vgReportSnapshots.asOfDate)),
    db.select().from(vgConvergenceAttendance).orderBy(asc(vgConvergenceAttendance.eventDate)),
    db.select().from(leadership113Batches).orderBy(asc(leadership113Batches.id)),
  ]);

  const latestRow = snapshots[0];
  const previousRow = snapshots[1] ?? null;

  const latest = latestRow ? { label: latestRow.label, data: latestRow.data as VgSnapshotData } : null;
  const previous = previousRow ? { label: previousRow.label, data: previousRow.data as VgSnapshotData } : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Quarterly Discipleship Report</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Each snapshot captures a point-in-time count. Save one at the end of every quarter to get quarter-over-quarter comparisons below.
          </p>
        </div>
        <SnapshotForm />
      </div>

      {!latest ? (
        <p className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-8 text-sm text-gray-400 text-center">
          No snapshots yet. Create one above to start tracking quarter-over-quarter numbers.
        </p>
      ) : (
        <>
          <CountsTable
            title="Number of Leaders"
            metric="vgLeaders"
            latest={latest}
            previous={previous}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Number of Leaders</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(["vgLeaders", "victoryGroups", "interns", "leadershipGroups"] as const).map((key) => (
                  <div key={key}>
                    <p className="text-gray-500 capitalize">
                      {key === "vgLeaders" ? "VG Leaders" : key === "victoryGroups" ? "Victory Groups" : key === "interns" ? "Interns" : "Leadership Group Leaders"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{latest.data.totals[key]}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">2026 Goals</p>
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
          </div>

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

      <ConvergenceSection entries={convergenceEntries} />
      <Leadership113Section batches={batches} />

      {snapshots.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Saved Snapshots</h3>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {snapshots.map((s) => <SnapshotListItem key={s.id} snapshot={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}

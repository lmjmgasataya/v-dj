import Link from "next/link";
import { getL113Batches, pickBatch } from "@/lib/l113Data";
import { formatPct, getBatchProgress, L113_MIN_ATTENDANCE_PCT, L113_MIN_SCORE_PCT } from "@/lib/l113Reports";
import { BatchPicker } from "@/components/BatchPicker";
import { Card, CardHeader, L113Header, NoBatches } from "../../ui";
import { CheckMark, pctClass, ReadyBadge, ReportTabs } from "../ui";

const PATH = "/l113-portal/reports/students";
const CRUMBS = [{ label: "Reports", href: "/l113-portal/reports" }];

export default async function L113StudentReportsPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { batch: batchParam } = await searchParams;
  const batches = await getL113Batches();
  const batch = pickBatch(batches, batchParam);
  if (!batch) {
    return (
      <>
        <L113Header title="Student Report Cards" crumbs={CRUMBS} />
        <NoBatches />
      </>
    );
  }

  const { students, dueMonths } = await getBatchProgress(batch);
  const onTrack = students.filter((p) => p.ready).length;

  return (
    <>
      <L113Header title="Student Report Cards" description={`${batch.name} · ${onTrack} of ${students.length} on track to graduate.`} crumbs={CRUMBS} />
      <ReportTabs current={PATH} batchId={batch.id} />
      <BatchPicker batches={batches} selectedId={batch.id} />

      <Card>
        <CardHeader
          title="Graduation Readiness"
          subtitle={`Attendance ≥ ${L113_MIN_ATTENDANCE_PCT}% · Score ≥ ${L113_MIN_SCORE_PCT}% · Spiritual Disciplines for every ended month (${dueMonths.length} so far). Click a name for the full report card.`}
        />
        {students.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">{batch.name} has no students yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name of Student</th>
                  <th className="px-3 py-2 text-right font-medium">Attendance</th>
                  <th className="px-3 py-2 text-right font-medium">Score</th>
                  <th className="px-3 py-2 text-right font-medium">Spiritual Disc.</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((p) => (
                  <tr key={p.student.vgLeaderId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`${PATH}/${p.student.vgLeaderId}?batch=${batch.id}`} className="text-indigo-700 hover:underline">
                        {p.student.name}
                      </Link>
                    </td>
                    <td className={`px-3 py-2 text-right ${pctClass(p.attendancePct, L113_MIN_ATTENDANCE_PCT)}`}>
                      {formatPct(p.attendancePct)} <CheckMark ok={p.checks.attendance} />
                    </td>
                    <td className={`px-3 py-2 text-right ${pctClass(p.scorePct, L113_MIN_SCORE_PCT)}`}>
                      {formatPct(p.scorePct)} <CheckMark ok={p.checks.score} />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {p.sdDue ? `${p.sdSubmitted}/${p.sdDue}` : "—"} <CheckMark ok={p.checks.disciplines} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ReadyBadge ready={p.ready} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

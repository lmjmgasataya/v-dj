import Link from "next/link";
import { getL113Batches, pickBatch } from "@/lib/l113Data";
import { formatPct, getBatchProgress, L113_ABSENCE_FLAG, L113_MIN_ATTENDANCE_PCT } from "@/lib/l113Reports";
import { formatL113Date } from "@/lib/l113";
import { checkInStatusBadgeClass } from "@/lib/checkinStatus";
import { BatchPicker } from "@/components/BatchPicker";
import { PrintButton } from "@/components/L113StudentQr";
import { Card, CardHeader, L113Header, NoBatches } from "../../ui";
import { pctClass, ReportTabs } from "../ui";

const PATH = "/l113-portal/reports/attendance";
const CRUMBS = [{ label: "Reports", href: "/l113-portal/reports" }];

export default async function L113AttendanceReportPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { batch: batchParam } = await searchParams;
  const batches = await getL113Batches();
  const batch = pickBatch(batches, batchParam);
  if (!batch) {
    return (
      <>
        <L113Header title="Batch Attendance Summary" crumbs={CRUMBS} />
        <NoBatches />
      </>
    );
  }

  const { schedule, students, statusOf } = await getBatchProgress(batch);
  const flagged = students.filter(
    (p) => (p.attendancePct != null && p.attendancePct < L113_MIN_ATTENDANCE_PCT) || p.absent >= L113_ABSENCE_FLAG
  );
  const dates = schedule
    .flatMap((s) => s.dates.map((d) => ({ ...d, topic: s.topic })))
    .sort((a, b) => a.classDate.localeCompare(b.classDate));
  const heldDates = dates.filter((d) => students.some((p) => statusOf(d.id, d.classDate, p.student.vgLeaderId)));
  const totals = students.reduce((t, p) => ({ onTime: t.onTime + p.onTime, late: t.late + p.late, absent: t.absent + p.absent }), {
    onTime: 0,
    late: 0,
    absent: 0,
  });
  const overall = totals.onTime + totals.late + totals.absent;

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <L113Header title="Batch Attendance Summary" description={`${batch.name} · ${heldDates.length} of ${dates.length} class dates held so far.`} crumbs={CRUMBS} />
        <PrintButton />
      </div>
      <ReportTabs current={PATH} batchId={batch.id} />
      <div className="print:hidden">
        <BatchPicker batches={batches} selectedId={batch.id} />
      </div>

      {students.length === 0 ? (
        <Card>
          <p className="px-6 py-8 text-sm text-gray-500 text-center">{batch.name} has no students yet.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile label="Batch attendance" value={formatPct(overall ? ((totals.onTime + totals.late) / overall) * 100 : null)} />
            <Tile label="On Time" value={totals.onTime} className="text-green-700" />
            <Tile label="Late" value={totals.late} className="text-orange-600" />
            <Tile label="Absent" value={totals.absent} className="text-red-600" />
          </div>

          <Card>
            <CardHeader
              title={`Needs attention (${flagged.length})`}
              subtitle={`Attendance below ${L113_MIN_ATTENDANCE_PCT}%, or ${L113_ABSENCE_FLAG} or more absences.`}
            />
            {flagged.length === 0 ? (
              <p className="px-6 py-5 text-sm text-gray-500">No one so far.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {flagged.map((p) => (
                  <li key={p.student.vgLeaderId} className="px-6 py-2.5 flex items-center justify-between gap-3 text-sm">
                    <Link href={`/l113-portal/reports/students/${p.student.vgLeaderId}?batch=${batch.id}`} className="text-indigo-700 hover:underline">
                      {p.student.name}
                    </Link>
                    <span className="text-xs text-gray-600">
                      {formatPct(p.attendancePct)} attendance · {p.absent} absent{p.late ? ` · ${p.late} late` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Per Student" subtitle="Attendance = (On Time + Late) ÷ class dates held. Click a name for the report card." />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Name of Student</th>
                    <th className="px-3 py-2 text-right font-medium">On Time</th>
                    <th className="px-3 py-2 text-right font-medium">Late</th>
                    <th className="px-3 py-2 text-right font-medium">Absent</th>
                    <th className="px-3 py-2 text-right font-medium">Held</th>
                    <th className="px-4 py-2 text-right font-medium">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((p) => (
                    <tr key={p.student.vgLeaderId} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link href={`/l113-portal/reports/students/${p.student.vgLeaderId}?batch=${batch.id}`} className="text-indigo-700 hover:underline">
                          {p.student.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right text-green-700">{p.onTime}</td>
                      <td className="px-3 py-2 text-right text-orange-600">{p.late}</td>
                      <td className={`px-3 py-2 text-right ${p.absent >= L113_ABSENCE_FLAG ? "text-red-600 font-semibold" : "text-red-600"}`}>{p.absent}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{p.held}</td>
                      <td className={`px-4 py-2 text-right ${pctClass(p.attendancePct, L113_MIN_ATTENDANCE_PCT)}`}>{formatPct(p.attendancePct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {heldDates.length > 0 && (
            <Card>
              <CardHeader title="Attendance Grid" subtitle="Each class date held so far." />
              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium sticky left-0 bg-gray-50">Name of Student</th>
                      {heldDates.map((d) => (
                        <th key={d.id} className="px-2 py-2 text-center font-medium whitespace-nowrap" title={d.topic}>
                          {formatL113Date(d.classDate).replace(/, \d{4}$/, "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((p) => (
                      <tr key={p.student.vgLeaderId}>
                        <td className="px-4 py-1.5 text-gray-800 whitespace-nowrap sticky left-0 bg-white">{p.student.name}</td>
                        {heldDates.map((d) => {
                          const status = statusOf(d.id, d.classDate, p.student.vgLeaderId);
                          return (
                            <td key={d.id} className="px-2 py-1.5 text-center">
                              {status ? (
                                <span className={`inline-block w-6 rounded font-semibold ${checkInStatusBadgeClass(status)}`} title={status}>
                                  {status === "On-time" ? "P" : status === "Late" ? "L" : "A"}
                                </span>
                              ) : (
                                <span className="text-gray-300">·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-6 py-2 text-[11px] text-gray-500 border-t border-gray-100">P = On Time · L = Late · A = Absent · hover a date for its topic</p>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function Tile({ label, value, className = "text-gray-900" }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
      <p className={`text-2xl font-bold ${className}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

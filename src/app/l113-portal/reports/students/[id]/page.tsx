import Link from "next/link";
import { notFound } from "next/navigation";
import { getL113Batches, pickBatch } from "@/lib/l113Data";
import { formatPct, getBatchProgress, L113_MIN_ATTENDANCE_PCT, L113_MIN_SCORE_PCT } from "@/lib/l113Reports";
import { formatMonth, formatL113Date, L113_STATUS_LABEL, SPIRITUAL_DISCIPLINE_QUESTIONS } from "@/lib/l113";
import { checkInStatusBadgeClass } from "@/lib/checkinStatus";
import { TZ } from "@/lib/date";
import { PrintButton } from "@/components/L113StudentQr";
import { Card, CardHeader, L113Header } from "../../../ui";
import { CheckMark, pctClass, ReadyBadge } from "../../ui";

export default async function L113ReportCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batch?: string }>;
}) {
  const [{ id }, { batch: batchParam }] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const batch = pickBatch(await getL113Batches(), batchParam);
  if (!batch) notFound();

  const progress = await getBatchProgress(batch);
  const p = progress.students.find((s) => s.student.vgLeaderId === Number(id));
  if (!p) notFound();
  const { student } = p;
  const vgl = student.vgLeaderId;

  const semesters = [1, 2, null] as const;
  const disciplines = progress.disciplinesOf(vgl);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <L113Header
          title={student.name}
          description={`Report card · ${batch.name}${student.service ? ` · ${student.service}` : ""}`}
          crumbs={[
            { label: "Reports", href: "/l113-portal/reports" },
            { label: "Student Report Cards", href: `/l113-portal/reports/students?batch=${batch.id}` },
          ]}
        />
        <PrintButton />
      </div>

      <Card>
        <CardHeader title="Graduation Readiness">
          <ReadyBadge ready={p.ready} />
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          <Check
            label="Attendance"
            value={formatPct(p.attendancePct)}
            detail={`${p.onTime} On Time · ${p.late} Late · ${p.absent} Absent of ${p.held} held · needs ${L113_MIN_ATTENDANCE_PCT}%`}
            ok={p.checks.attendance}
          />
          <Check
            label="Overall score"
            value={formatPct(p.scorePct)}
            detail={`${p.scoredTopics} topic${p.scoredTopics === 1 ? "" : "s"} scored · needs ${L113_MIN_SCORE_PCT}%`}
            ok={p.checks.score}
          />
          <Check
            label="Spiritual Disciplines"
            value={p.sdDue ? `${p.sdSubmitted}/${p.sdDue}` : "—"}
            detail={p.sdDue ? "months submitted of those that have ended" : "No month of the batch has ended yet"}
            ok={p.checks.disciplines}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Topics" subtitle="Attendance and score per topic." />
        {progress.schedule.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-500">No topics scheduled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Topic</th>
                  <th className="px-3 py-2 text-left font-medium">Attendance</th>
                  <th className="px-4 py-2 text-right font-medium">Score</th>
                </tr>
              </thead>
              {semesters.map((sem) => {
                const topics = progress.schedule.filter((s) => s.semester === sem);
                if (topics.length === 0) return null;
                return (
                  <tbody key={String(sem)} className="divide-y divide-gray-100">
                    {sem && (
                      <tr className="bg-[#00428E]/5">
                        <td colSpan={3} className="px-4 py-1.5 text-xs font-bold tracking-wide text-[#00428E]">
                          SEMESTER {sem}
                          <span className="ml-2 font-medium text-gray-500">· score {formatPct(p.semesterScorePct[sem])}</span>
                        </td>
                      </tr>
                    )}
                    {topics.map((t) => {
                      const score = progress.scoreOf(t.id, vgl);
                      return (
                        <tr key={t.id} className="align-top">
                          <td className="px-4 py-2">
                            <p className="text-gray-800">{t.topic}</p>
                            <p className="text-xs text-gray-500">{t.teacher}</p>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              {t.dates.map((d) => {
                                const status = progress.statusOf(d.id, d.classDate, vgl);
                                const at = progress.checkInTime(d.id, vgl);
                                const time =
                                  at && at.toLocaleDateString("en-CA", { timeZone: TZ }) === d.classDate
                                    ? ` ${at.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: TZ })}`
                                    : "";
                                return (
                                  <span
                                    key={d.id}
                                    className={`text-xs px-2 py-0.5 rounded ${status ? checkInStatusBadgeClass(status) : "bg-gray-100 text-gray-500"}`}
                                  >
                                    {formatL113Date(d.classDate).replace(/, \d{4}$/, "")}: {status ? `${L113_STATUS_LABEL[status]}${time}` : "Upcoming"}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            {score ? (
                              <span className={pctClass((score.score / score.highest) * 100, L113_MIN_SCORE_PCT)}>
                                {score.score}/{score.highest} ({formatPct((score.score / score.highest) * 100)})
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Spiritual Disciplines" subtitle="Monthly reports the student submitted." />
        {disciplines.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-500">No reports submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium uppercase tracking-wide">Month</th>
                  {SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => (
                    <th key={q.key} className="px-3 py-2 text-center font-medium max-w-40">
                      {q.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {disciplines.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2 text-gray-800 whitespace-nowrap">{formatMonth(d.month)}</td>
                    {SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => (
                      <td key={q.key} className="px-3 py-2 text-center text-gray-700">
                        {d[q.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold text-gray-700">
                <tr>
                  <td className="px-4 py-2">Total</td>
                  {SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => (
                    <td key={q.key} className="px-3 py-2 text-center">
                      {disciplines.reduce((n, d) => n + d[q.key], 0)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {progress.dueMonths.some((m) => !disciplines.some((d) => d.month === m)) && (
          <p className="px-6 py-2 text-xs text-red-600 border-t border-gray-100">
            Missing: {progress.dueMonths.filter((m) => !disciplines.some((d) => d.month === m)).map(formatMonth).join(", ")}
          </p>
        )}
      </Card>

      <p className="text-xs text-gray-400 print:hidden">
        <Link href={`/l113-portal/reports/students?batch=${batch.id}`} className="text-indigo-600 hover:underline">
          ← All students in {batch.name}
        </Link>
      </p>
    </>
  );
}

function Check({ label, value, detail, ok }: { label: string; value: string; detail: string; ok: boolean | null }) {
  return (
    <div className="px-6 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {value} <CheckMark ok={ok} />
      </p>
      <p className="text-xs text-gray-500 mt-1">{detail}</p>
    </div>
  );
}

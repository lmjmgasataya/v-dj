import Link from "next/link";
import { getL113Batches } from "@/lib/l113Data";
import { averageRatings, formatRating, getTeacherEvaluationRows } from "@/lib/l113Reports";
import { TEACHER_EVAL_QUESTIONS } from "@/lib/l113";
import { Card, CardHeader, L113Header } from "../../ui";
import { ParamSelect } from "../../ParamSelect";
import { ReportTabs } from "../ui";

const PATH = "/l113-portal/reports/teachers";

export default async function L113TeacherScorecardPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { batch: batchParam } = await searchParams;
  const batches = await getL113Batches();
  const batch = batches.find((b) => String(b.id) === batchParam) ?? null;
  const rows = await getTeacherEvaluationRows(batch?.id);

  const teachers = [...new Map(rows.map((r) => [r.teacherId, r.teacher])).entries()]
    .map(([id, name]) => {
      const mine = rows.filter((r) => r.teacherId === id);
      return { id, name, topics: new Set(mine.map((r) => r.scheduleId)).size, responses: mine.length, ...averageRatings(mine) };
    })
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0) || a.name.localeCompare(b.name));

  return (
    <>
      <L113Header
        title="Teacher Scorecard"
        description="Students' average ratings, 1 (strongly disagree) to 5 (strongly agree). Click a teacher for their topics and comments."
        crumbs={[{ label: "Reports", href: "/l113-portal/reports" }]}
      />
      <ReportTabs current={PATH} batchId={batch?.id} />
      <ParamSelect
        label="Batch"
        hrefPrefix={`${PATH}?batch=`}
        value={batch ? String(batch.id) : ""}
        options={[{ value: "", label: "All batches" }, ...batches.map((b) => ({ value: String(b.id), label: b.name }))]}
      />

      <Card>
        <CardHeader title={batch ? batch.name : "All batches"} subtitle={`${rows.length} evaluation${rows.length === 1 ? "" : "s"} from students`} />
        {teachers.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">No teacher evaluations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium uppercase tracking-wide">Teacher/ Facilitator</th>
                  <th className="px-3 py-2 text-right font-medium uppercase tracking-wide">Topics</th>
                  <th className="px-3 py-2 text-right font-medium uppercase tracking-wide">Responses</th>
                  {TEACHER_EVAL_QUESTIONS.map((q) => (
                    <th key={q.key} className="px-3 py-2 text-center font-medium max-w-44">
                      {q.label}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-center font-medium uppercase tracking-wide">Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`${PATH}/${t.id}${batch ? `?batch=${batch.id}` : ""}`} className="font-medium text-indigo-700 hover:underline">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{t.topics}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{t.responses}</td>
                    {TEACHER_EVAL_QUESTIONS.map((q) => (
                      <td key={q.key} className="px-3 py-2.5 text-center text-gray-700">
                        {formatRating(t[q.key])}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center font-semibold text-gray-900">{formatRating(t.overall)}</td>
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

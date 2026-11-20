import { notFound } from "next/navigation";
import { db } from "@/db";
import { l113Teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getL113Batches } from "@/lib/l113Data";
import { averageRatings, formatRating, getTeacherEvaluationRows } from "@/lib/l113Reports";
import { TEACHER_EVAL_QUESTIONS, TEACHER_EVAL_TEXT_QUESTIONS } from "@/lib/l113";
import { PrintButton } from "@/components/L113StudentQr";
import { Card, CardHeader, L113Header } from "../../../ui";

export default async function L113TeacherReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batch?: string }>;
}) {
  const [{ id }, { batch: batchParam }] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const [[teacher], batches] = await Promise.all([
    db.select().from(l113Teachers).where(eq(l113Teachers.id, Number(id))).limit(1),
    getL113Batches(),
  ]);
  if (!teacher) notFound();
  const batch = batches.find((b) => String(b.id) === batchParam) ?? null;
  const rows = (await getTeacherEvaluationRows(batch?.id)).filter((r) => r.teacherId === teacher.id);
  const overall = averageRatings(rows);

  // One section per topic taught (newest batch first).
  const topics = [...new Map(rows.map((r) => [r.scheduleId, r])).values()].sort(
    (a, b) => b.batchStart.localeCompare(a.batchStart) || a.topic.localeCompare(b.topic)
  );

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <L113Header
          title={teacher.name}
          description={`Teacher scorecard · ${batch ? batch.name : "all batches"} · ${rows.length} response${rows.length === 1 ? "" : "s"}`}
          crumbs={[
            { label: "Reports", href: "/l113-portal/reports" },
            { label: "Teacher Scorecard", href: `/l113-portal/reports/teachers${batch ? `?batch=${batch.id}` : ""}` },
          ]}
        />
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Overall" value={formatRating(overall.overall)} />
        {TEACHER_EVAL_QUESTIONS.map((q, i) => (
          <Tile key={q.key} label={["Prepared & organized", "Clear explaining", "Responds to questions"][i]} value={formatRating(overall[q.key])} />
        ))}
      </div>

      {topics.length === 0 ? (
        <Card>
          <p className="px-6 py-8 text-sm text-gray-500 text-center">No evaluations for {teacher.name} yet.</p>
        </Card>
      ) : (
        topics.map((t) => {
          const mine = rows.filter((r) => r.scheduleId === t.scheduleId);
          const avg = averageRatings(mine);
          return (
            <Card key={t.scheduleId}>
              <CardHeader
                title={t.topic}
                subtitle={`${t.batch} · ${mine.length} response${mine.length === 1 ? "" : "s"} · overall ${formatRating(avg.overall)} (${TEACHER_EVAL_QUESTIONS.map((q) => formatRating(avg[q.key])).join(" / ")})`}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-gray-100">
                {TEACHER_EVAL_TEXT_QUESTIONS.map((q) => {
                  const answers = mine.filter((r) => r[q.key]);
                  return (
                    <div key={q.key} className="px-6 py-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{q.label}</p>
                      {answers.length === 0 ? (
                        <p className="text-sm text-gray-400">No answers.</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {answers.map((r) => (
                            <li key={r.id} className="text-sm text-gray-700 whitespace-pre-line border-l-2 border-indigo-200 pl-3">
                              {r[q.key]}
                              <span className="block text-[11px] text-gray-400 mt-0.5">
                                {r.student} {r.studentLast}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })
      )}
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

import { getL113Batches, pickBatch } from "@/lib/l113Data";
import { averageRatings, getTeacherEvaluationRows } from "@/lib/l113Reports";
import { TEACHER_EVAL_QUESTIONS, TEACHER_EVAL_TEXT_QUESTIONS } from "@/lib/l113";
import { todayPH } from "@/lib/date";
import { isL113ExportAllowed, xlsxResponse, type Cell } from "@/lib/xlsxExport";

const round = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);

// Teacher Evaluation for a batch: averages per topic, and every response.
export async function GET(request: Request) {
  if (!(await isL113ExportAllowed())) return new Response("Unauthorized", { status: 401 });
  const batch = pickBatch(await getL113Batches(), new URL(request.url).searchParams.get("batch") ?? undefined);
  if (!batch) return new Response("No batch", { status: 404 });

  const rows = await getTeacherEvaluationRows(batch.id);
  const ratingLabels = TEACHER_EVAL_QUESTIONS.map((q) => q.label);

  const topics = [...new Map(rows.map((r) => [r.scheduleId, r])).values()];
  const summary: Cell[][] = [["Topic", "Teacher/ Facilitator", "Responses", ...ratingLabels, "Overall"]];
  for (const t of topics) {
    const mine = rows.filter((r) => r.scheduleId === t.scheduleId);
    const avg = averageRatings(mine);
    summary.push([t.topic, t.teacher, mine.length, ...TEACHER_EVAL_QUESTIONS.map((q) => round(avg[q.key])), round(avg.overall)]);
  }

  const responses: Cell[][] = [
    ["Topic", "Teacher/ Facilitator", "Name of Student", ...ratingLabels, ...TEACHER_EVAL_TEXT_QUESTIONS.map((q) => q.label)],
    ...rows.map((r) => [
      r.topic,
      r.teacher,
      `${r.studentLast}, ${r.student}`,
      ...TEACHER_EVAL_QUESTIONS.map((q) => r[q.key]),
      ...TEACHER_EVAL_TEXT_QUESTIONS.map((q) => r[q.key] ?? ""),
    ]),
  ];

  return xlsxResponse(
    [
      { name: "Summary", rows: summary, cols: [36, 26, 11, 24, 24, 24, 9] },
      { name: "Responses", rows: responses, cols: [36, 26, 30, 14, 14, 14, 50, 50] },
    ],
    `l113_teacher_evaluation_${batch.name}_${todayPH()}.xlsx`
  );
}

import { db } from "@/db";
import { l113StudentEvaluations } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getBatchSchedule, getBatchStudents, getL113Batches, pickBatch } from "@/lib/l113Data";
import { todayPH } from "@/lib/date";
import { isL113ExportAllowed, xlsxResponse, type Cell } from "@/lib/xlsxExport";

const round = (n: number) => Math.round(n * 10) / 10;

// Student Evaluation: a students × topics sheet (score / highest, overall %) and one row per score.
export async function GET(request: Request) {
  if (!(await isL113ExportAllowed())) return new Response("Unauthorized", { status: 401 });
  const batch = pickBatch(await getL113Batches(), new URL(request.url).searchParams.get("batch") ?? undefined);
  if (!batch) return new Response("No batch", { status: 404 });

  const [schedule, students] = await Promise.all([getBatchSchedule(batch.id), getBatchStudents(batch.id)]);
  const evals = schedule.length
    ? await db.select().from(l113StudentEvaluations).where(inArray(l113StudentEvaluations.scheduleId, schedule.map((s) => s.id)))
    : [];
  const evalOf = (scheduleId: number, vgLeaderId: number) => evals.find((e) => e.scheduleId === scheduleId && e.vgLeaderId === vgLeaderId);

  const matrix: Cell[][] = [["Name of Student", ...schedule.map((s) => s.topic), "Total", "Highest Possible", "Overall %"]];
  for (const st of students) {
    const mine = evals.filter((e) => e.vgLeaderId === st.vgLeaderId);
    const total = mine.reduce((n, e) => n + e.score, 0);
    const max = mine.reduce((n, e) => n + e.highestPossibleScore, 0);
    matrix.push([
      st.name,
      ...schedule.map((s) => {
        const e = evalOf(s.id, st.vgLeaderId);
        return e ? `${e.score}/${e.highestPossibleScore}` : null;
      }),
      mine.length ? total : null,
      mine.length ? max : null,
      max > 0 ? round((total / max) * 100) : null,
    ]);
  }

  const details: Cell[][] = [["Name of Student", "Topic", "Semester", "Teacher/ Facilitator", "Score/Rating", "Highest Possible Score/Rating", "%"]];
  for (const s of schedule) {
    for (const st of students) {
      const e = evalOf(s.id, st.vgLeaderId);
      if (!e) continue;
      details.push([st.name, s.topic, s.semester ?? null, s.teacher, e.score, e.highestPossibleScore, round((e.score / e.highestPossibleScore) * 100)]);
    }
  }

  return xlsxResponse(
    [
      { name: "Scores", rows: matrix, cols: [32, ...schedule.map(() => 16), 10, 16, 11] },
      { name: "Details", rows: details, cols: [32, 36, 10, 26, 13, 26, 8] },
    ],
    `l113_student_evaluation_${batch.name}_${todayPH()}.xlsx`
  );
}

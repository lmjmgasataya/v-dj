import { db } from "@/db";
import { l113SpiritualDisciplines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBatchStudents, getL113Batches, pickBatch } from "@/lib/l113Data";
import { batchMonths, formatMonth, SPIRITUAL_DISCIPLINE_QUESTIONS } from "@/lib/l113";
import { todayPH } from "@/lib/date";
import { isL113ExportAllowed, xlsxResponse, type Cell, type Sheet } from "@/lib/xlsxExport";

// The Spiritual Disciplines Calendar: one sheet per month of the batch, plus every entry in one list.
export async function GET(request: Request) {
  if (!(await isL113ExportAllowed())) return new Response("Unauthorized", { status: 401 });
  const batch = pickBatch(await getL113Batches(), new URL(request.url).searchParams.get("batch") ?? undefined);
  if (!batch) return new Response("No batch", { status: 404 });

  const [students, entries] = await Promise.all([
    getBatchStudents(batch.id),
    db.select().from(l113SpiritualDisciplines).where(eq(l113SpiritualDisciplines.batchId, batch.id)),
  ]);
  const questions = SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => q.label);
  const cols = [32, ...questions.map(() => 22), 14];

  const sheets: Sheet[] = batchMonths(batch.startDate, batch.endDate).map((month) => {
    const rows: Cell[][] = [["Name of Student", ...questions, "Submitted"]];
    for (const s of students) {
      const e = entries.find((x) => x.vgLeaderId === s.vgLeaderId && x.month === month);
      rows.push([s.name, ...SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => (e ? e[q.key] : null)), e ? "Yes" : "Not yet"]);
    }
    const monthEntries = entries.filter((x) => x.month === month);
    rows.push(["Total", ...SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => monthEntries.reduce((n, e) => n + e[q.key], 0)), `${monthEntries.length}/${students.length}`]);
    return { name: formatMonth(month), rows, cols };
  });

  const nameOf = new Map(students.map((s) => [s.vgLeaderId, s.name]));
  sheets.push({
    name: "All entries",
    rows: [
      ["Month", "Name of Student", ...questions],
      ...entries
        .sort((a, b) => a.month.localeCompare(b.month) || (nameOf.get(a.vgLeaderId) ?? "").localeCompare(nameOf.get(b.vgLeaderId) ?? ""))
        .map((e) => [formatMonth(e.month), nameOf.get(e.vgLeaderId) ?? "(removed from batch)", ...SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => e[q.key])]),
    ],
    cols: [16, 32, ...questions.map(() => 22)],
  });

  return xlsxResponse(sheets, `l113_spiritual_disciplines_${batch.name}_${todayPH()}.xlsx`);
}

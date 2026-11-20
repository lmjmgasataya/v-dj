import { getBatchSchedule, getL113Batches, pickBatch } from "@/lib/l113Data";
import { formatScheduleDates } from "@/lib/l113";
import { todayPH } from "@/lib/date";
import { isL113ExportAllowed, xlsxResponse, type Cell } from "@/lib/xlsxExport";

// The batch's schedule as laid out on the Schedule page (semester headings, total weeks).
export async function GET(request: Request) {
  if (!(await isL113ExportAllowed())) return new Response("Unauthorized", { status: 401 });
  const batch = pickBatch(await getL113Batches(), new URL(request.url).searchParams.get("batch") ?? undefined);
  if (!batch) return new Response("No batch", { status: 404 });

  const schedule = await getBatchSchedule(batch.id, { includeBreaks: true });
  const rows: Cell[][] = [
    [`${/leadership\s*113/i.test(batch.name) ? "" : "LEADERSHIP 113 - "}${batch.name.toUpperCase()} CALENDAR (${batch.startDate.slice(0, 4)})`],
    [],
    ["Semester", "Topic", "Weeks", "Dates", "Teacher/ Facilitator", "Remarks"],
  ];
  for (const s of schedule) {
    rows.push([
      s.semester ? `Semester ${s.semester}` : "",
      s.topic,
      s.isBreak ? null : s.dates.length,
      formatScheduleDates(s.dates.map((d) => d.classDate)),
      s.teacher,
      s.remarks ?? "",
    ]);
  }
  const classes = schedule.filter((s) => !s.isBreak);
  const weeks = (sem?: number) => classes.filter((s) => sem == null || s.semester === sem).reduce((n, s) => n + s.dates.length, 0);
  rows.push([], ["", "Semester 1 weeks", weeks(1)], ["", "Semester 2 weeks", weeks(2)], ["", "TOTAL NUMBER OF WEEKS", weeks()]);

  return xlsxResponse(
    [{ name: "Schedule", rows, cols: [12, 40, 8, 34, 26, 32] }],
    `l113_schedule_${batch.name}_${todayPH()}.xlsx`
  );
}

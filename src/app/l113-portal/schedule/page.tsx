import Link from "next/link";
import { getBatchSchedule, getL113Batches, getL113Teachers, getL113Topics, pickBatch } from "@/lib/l113Data";
import { BatchPicker } from "@/components/BatchPicker";
import { Card, L113Header, NoBatches } from "../ui";
import { ScheduleTable, type ScheduleRow } from "./ScheduleTable";

export default async function L113SchedulePage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { batch: batchParam } = await searchParams;
  const [batches, teachers, topics] = await Promise.all([getL113Batches(), getL113Teachers(), getL113Topics()]);
  const batch = pickBatch(batches, batchParam);
  const schedule = batch ? await getBatchSchedule(batch.id, { includeBreaks: true }) : [];
  const rows: ScheduleRow[] = schedule.map((s) => ({
    id: s.id,
    topic: s.topic,
    teacherId: s.teacherId,
    teacher: s.teacher,
    isBreak: s.isBreak,
    remarks: s.remarks,
    dates: s.dates.map((d) => d.classDate),
  }));

  return (
    <>
      <L113Header title="Schedule" description="Topics, class dates and teachers per batch. Click Edit on a row to change it, or add a new entry at the bottom." />
      {!batch ? (
        <NoBatches />
      ) : (
        <>
          <BatchPicker batches={batches} selectedId={batch.id} />
          <Card>
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 uppercase tracking-wide">
                Leadership 113 – {batch.name} Calendar ({batch.startDate.slice(0, 4)})
              </h3>
              <div className="flex gap-3 text-xs shrink-0">
                <Link href="/l113-portal/topics" className="text-indigo-600 hover:text-indigo-800">
                  Manage topics
                </Link>
                <Link href="/l113-portal/teachers" className="text-indigo-600 hover:text-indigo-800">
                  Manage teachers
                </Link>
              </div>
            </div>
            {/* Remount when the saved rows change so the editor closes and the add row clears. */}
            <ScheduleTable key={JSON.stringify(rows)} batchId={batch.id} rows={rows} topics={topics.map((t) => t.name)} teachers={teachers} />
          </Card>
        </>
      )}
    </>
  );
}

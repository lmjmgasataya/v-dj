import Link from "next/link";
import { db } from "@/db";
import { l113CheckIns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBatchSchedule, getBatchStudents, getL113Batches, pickBatch } from "@/lib/l113Data";
import { TZ, todayPH } from "@/lib/date";
import { BatchPicker } from "@/components/BatchPicker";
import { Card, L113Header, NoBatches } from "../ui";
import { CheckInArea, type CheckInStudent } from "./CheckInArea";

/** "Sat, Nov 22, 2026" (same format as /admin's session picker). */
function weekdayDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: TZ });
}

export default async function L113CheckInPage({ searchParams }: { searchParams: Promise<{ batch?: string; date?: string }> }) {
  const { batch: batchParam, date: dateParam } = await searchParams;
  const batches = await getL113Batches();
  const batch = pickBatch(batches, batchParam);

  if (!batch) {
    return (
      <>
        <L113Header title="Check In" />
        <NoBatches />
      </>
    );
  }

  const [schedule, students] = await Promise.all([getBatchSchedule(batch.id), getBatchStudents(batch.id)]);
  const classDates = schedule
    .flatMap((s) => s.dates.map((d) => ({ id: d.id, classDate: d.classDate, topic: s.topic, teacher: s.teacher, dateLabel: weekdayDate(d.classDate) })))
    .sort((a, b) => a.classDate.localeCompare(b.classDate) || a.id - b.id);

  // Default: today's class, else the next one, else the last one.
  const today = todayPH();
  const selected =
    classDates.find((d) => String(d.id) === dateParam) ??
    classDates.find((d) => d.classDate === today) ??
    classDates.find((d) => d.classDate > today) ??
    classDates[classDates.length - 1];

  const checkIns = selected
    ? await db
        .select({ vgLeaderId: l113CheckIns.vgLeaderId, status: l113CheckIns.status, checkedInAt: l113CheckIns.checkedInAt })
        .from(l113CheckIns)
        .where(eq(l113CheckIns.scheduleDateId, selected.id))
    : [];
  const byStudent = new Map(checkIns.map((c) => [c.vgLeaderId, c]));
  const rows: CheckInStudent[] = students.map((s) => {
    const c = byStudent.get(s.vgLeaderId);
    return {
      vgLeaderId: s.vgLeaderId,
      lastName: s.lastName,
      firstName: s.firstName,
      nickname: s.nickname,
      service: s.service,
      checkIn: c
        ? {
            status: c.status,
            at: c.checkedInAt.toISOString(),
            // A status set later (a correction on a past date) has no meaningful time.
            time:
              c.checkedInAt.toLocaleDateString("en-CA", { timeZone: TZ }) === selected?.classDate
                ? c.checkedInAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: TZ })
                : null,
          }
        : null,
    };
  });

  const phase = !selected ? "future" : selected.classDate === today ? "today" : selected.classDate < today ? "past" : "future";

  return (
    <>
      <L113Header title="Check In" description="Select a topic, then scan or search a student." />
      <BatchPicker batches={batches} selectedId={batch.id} />
      {!selected ? (
        <Card>
          <p className="px-6 py-8 text-sm text-gray-500 text-center">
            {batch.name} has no schedule yet.{" "}
            <Link href={`/l113-portal/schedule?batch=${batch.id}`} className="text-indigo-600 font-medium hover:underline">
              Add topics
            </Link>{" "}
            first.
          </p>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <p className="px-6 py-8 text-sm text-gray-500 text-center">
            {batch.name} has no students yet.{" "}
            <Link href={`/l113-portal/batches/${batch.id}`} className="text-indigo-600 font-medium hover:underline">
              Add students
            </Link>{" "}
            first.
          </p>
        </Card>
      ) : (
        <CheckInArea
          key={selected.id}
          batchId={batch.id}
          batchName={batch.name}
          options={classDates}
          selectedId={selected.id}
          phase={phase}
          students={rows}
        />
      )}
    </>
  );
}

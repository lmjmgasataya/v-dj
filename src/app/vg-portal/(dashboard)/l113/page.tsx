import Link from "next/link";
import { db } from "@/db";
import { l113CheckIns, l113TeacherEvaluations } from "@/db/schema";
import type { CheckInStatus } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { L113StudentQr } from "@/components/L113StudentQr";
import { getBatchSchedule } from "@/lib/l113Data";
import { checkInStatusBadgeClass } from "@/lib/checkinStatus";
import { formatL113Date, L113_STATUS_LABEL, STUDENT_EVALUATION_FORM_PATH, STUDENT_L113_PATH, STUDENT_SPIRITUAL_DISCIPLINES_PATH, STUDENT_TEACHER_EVALUATION_PATH } from "@/lib/l113";
import { todayPH } from "@/lib/date";
import { requireL113Student } from "./student";

export default async function StudentL113Page() {
  const { vgLeaderId, batch } = await requireL113Student(STUDENT_L113_PATH);

  const header = (
    <div>
      <Breadcrumbs items={[{ label: "VG Leader Portal", href: "/vg-portal" }, { label: "Leadership 113" }]} />
      <h2 className="text-2xl font-bold text-gray-900">Leadership 113</h2>
      {batch && <p className="text-sm text-gray-500 mt-0.5">{batch.name}</p>}
    </div>
  );

  if (!batch) {
    return (
      <>
        {header}
        <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">You&apos;re not in a Leadership 113 batch yet.</p>
      </>
    );
  }

  const schedule = await getBatchSchedule(batch.id);
  const dateIds = schedule.flatMap((s) => s.dates.map((d) => d.id));
  const [checkIns, evaluated] = await Promise.all([
    dateIds.length
      ? db
          .select({ scheduleDateId: l113CheckIns.scheduleDateId, status: l113CheckIns.status })
          .from(l113CheckIns)
          .where(and(eq(l113CheckIns.vgLeaderId, vgLeaderId), inArray(l113CheckIns.scheduleDateId, dateIds)))
      : Promise.resolve([]),
    db.select({ scheduleId: l113TeacherEvaluations.scheduleId }).from(l113TeacherEvaluations).where(eq(l113TeacherEvaluations.vgLeaderId, vgLeaderId)),
  ]);
  const statusOf = new Map(checkIns.map((c) => [c.scheduleDateId, c.status]));
  const evaluatedIds = new Set(evaluated.map((e) => e.scheduleId));
  const today = todayPH();

  return (
    <>
      {header}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-base font-semibold text-gray-800">Your Check-in QR Code</p>
          <div className="p-3 bg-white">
            <L113StudentQr vgLeaderId={vgLeaderId} size={180} />
          </div>
          <p className="text-sm text-gray-500 text-center">Show this at L113 class check-in. Arrive by 9:00 AM to be On Time.</p>
        </div>
        <div className="flex flex-col gap-4">
          <Link
            href={STUDENT_SPIRITUAL_DISCIPLINES_PATH}
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition"
          >
            <span className="font-semibold text-gray-900 text-base">📖 Spiritual Disciplines Calendar</span>
            <span className="text-sm text-gray-500">Encode your monthly Bible reading, soul winning and prayer meetings.</span>
          </Link>
          <Link
            href={STUDENT_TEACHER_EVALUATION_PATH}
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition"
          >
            <span className="font-semibold text-gray-900 text-base">⭐ Teacher Evaluation</span>
            <span className="text-sm text-gray-500">Rate the teacher/facilitator of each topic.</span>
          </Link>
          <Link
            href={STUDENT_EVALUATION_FORM_PATH}
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition"
          >
            <span className="font-semibold text-gray-900 text-base">📝 Student Evaluation</span>
            <span className="text-sm text-gray-500">Submit your score/rating for each topic.</span>
          </Link>
        </div>
      </div>

      {schedule.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <p className="px-5 py-4 border-b border-gray-100 text-base font-semibold text-gray-800">Schedule &amp; Attendance</p>
          <ul className="divide-y divide-gray-100">
            {schedule.map((s) => (
              <li key={s.id} className="px-5 py-3 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{s.topic}</p>
                    <p className="text-sm text-gray-500">{s.teacher}</p>
                  </div>
                  {s.dates.some((d) => d.classDate <= today) &&
                    (evaluatedIds.has(s.id) ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 shrink-0">Evaluated ✓</span>
                    ) : (
                      <Link
                        href={`${STUDENT_TEACHER_EVALUATION_PATH}?topic=${s.id}`}
                        className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 shrink-0"
                      >
                        Evaluate teacher
                      </Link>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.dates.map((d) => {
                    const status: CheckInStatus | null = statusOf.get(d.id) ?? (d.classDate < today ? "Absent" : null);
                    return (
                      <span
                        key={d.id}
                        className={`text-xs px-2 py-0.5 rounded font-medium ${status ? checkInStatusBadgeClass(status) : "bg-gray-100 text-gray-500"}`}
                      >
                        {formatL113Date(d.classDate)}
                        {status ? ` · ${L113_STATUS_LABEL[status]}` : ""}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

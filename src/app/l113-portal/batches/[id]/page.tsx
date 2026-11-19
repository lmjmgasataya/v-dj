import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { l113Batches, l113BatchStudents, l113CheckIns } from "@/db/schema";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getBatchSchedule, getBatchStudents } from "@/lib/l113Data";
import { formatL113Date } from "@/lib/l113";
import { todayPH } from "@/lib/date";
import { getL113CandidateRows } from "../../potential-students/candidateRows";
import { ConfirmDeleteButton } from "@/app/sessions/batches/ConfirmDeleteButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardHeader, L113Header, l113Input, l113PrimaryButton } from "../../ui";
import { deleteL113Batch, removeL113Student, updateL113Batch } from "../actions";
import { AddStudentsForm, type AddableStudent } from "./AddStudentsForm";

export default async function L113BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const batchId = Number(id);

  const session = await getSession();
  const [[batch], students, schedule, candidates] = await Promise.all([
    db.select().from(l113Batches).where(eq(l113Batches.id, batchId)).limit(1),
    getBatchStudents(batchId),
    getBatchSchedule(batchId),
    getL113CandidateRows(session),
  ]);
  if (!batch) notFound();

  // Attendance so far: class dates up to today. No check-in on a past date = Absent; today's
  // missing check-ins aren't counted until the day is over.
  const today = todayPH();
  const heldDates = schedule.flatMap((s) => s.dates).filter((d) => d.classDate <= today);
  const pastDateIds = new Set(heldDates.filter((d) => d.classDate < today).map((d) => d.id));

  const candidateIds = candidates.map((c) => c.id);
  const [checkIns, otherMemberships] = await Promise.all([
    heldDates.length
      ? db
          .select({ vgLeaderId: l113CheckIns.vgLeaderId, scheduleDateId: l113CheckIns.scheduleDateId, status: l113CheckIns.status })
          .from(l113CheckIns)
          .where(inArray(l113CheckIns.scheduleDateId, heldDates.map((d) => d.id)))
      : Promise.resolve([]),
    candidateIds.length
      ? db
          .select({ vgLeaderId: l113BatchStudents.vgLeaderId, batchName: l113Batches.name })
          .from(l113BatchStudents)
          .innerJoin(l113Batches, eq(l113Batches.id, l113BatchStudents.batchId))
          .where(and(inArray(l113BatchStudents.vgLeaderId, candidateIds), ne(l113BatchStudents.batchId, batchId)))
      : Promise.resolve([]),
  ]);

  const attendance = new Map<number, { onTime: number; late: number; absent: number }>();
  for (const s of students) {
    const mine = checkIns.filter((c) => c.vgLeaderId === s.vgLeaderId);
    const checkedDates = new Set(mine.map((c) => c.scheduleDateId));
    attendance.set(s.vgLeaderId, {
      onTime: mine.filter((c) => c.status === "On-time").length,
      late: mine.filter((c) => c.status === "Late").length,
      absent: mine.filter((c) => c.status === "Absent").length + [...pastDateIds].filter((d) => !checkedDates.has(d)).length,
    });
  }

  const inThisBatch = new Set(students.map((s) => s.vgLeaderId));
  const otherBatchOf = new Map(otherMemberships.map((m) => [m.vgLeaderId, m.batchName]));
  const addable: AddableStudent[] = candidates
    .filter((c) => !inThisBatch.has(c.id))
    .map((c) => ({
      id: c.id,
      lastName: c.lastName,
      firstName: c.firstName,
      nickname: c.nickname,
      service: c.service,
      empoweringLeaders: c.empoweringLeaders,
      otherBatch: otherBatchOf.get(c.id) ?? null,
    }));

  return (
    <>
      <L113Header
        title={batch.name}
        description={`${formatL113Date(batch.startDate)} – ${formatL113Date(batch.endDate)} · ${students.length} student${students.length === 1 ? "" : "s"}`}
        crumbs={[{ label: "Batches", href: "/l113-portal/batches" }]}
      />

      <Card>
        <CardHeader title="Batch Details">
          <ConfirmDeleteButton
            action={deleteL113Batch}
            hiddenFields={{ id: String(batch.id) }}
            message={`Delete "${batch.name}"? Its students, schedule, check-ins and evaluations are deleted too.`}
          />
        </CardHeader>
        <form action={updateL113Batch} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end px-6 py-5">
          <input type="hidden" name="id" value={batch.id} />
          <div className="sm:col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input name="name" required defaultValue={batch.name} className={l113Input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input type="date" name="startDate" required defaultValue={batch.startDate} className={l113Input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input type="date" name="endDate" required defaultValue={batch.endDate} className={l113Input} />
          </div>
          <SubmitButton label="Save" pendingLabel="Saving…" className={l113PrimaryButton} />
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Students"
          subtitle={`Attendance counts ${heldDates.length} class date${heldDates.length === 1 ? "" : "s"} held so far.`}
        >
          {students.length > 0 && (
            <Link
              href={`/l113-portal/qr-codes?batch=${batch.id}`}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              🔳 QR codes
            </Link>
          )}
        </CardHeader>
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Service</th>
                  <th className="px-4 py-2 text-center font-medium">On Time</th>
                  <th className="px-4 py-2 text-center font-medium">Late</th>
                  <th className="px-4 py-2 text-center font-medium">Absent</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s) => {
                  const a = attendance.get(s.vgLeaderId)!;
                  return (
                    <tr key={s.vgLeaderId} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-800">
                        {s.name}
                        {s.nickname && <span className="text-gray-400"> ({s.nickname})</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{s.service ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center text-green-700">{a.onTime}</td>
                      <td className="px-4 py-2.5 text-center text-orange-600">{a.late}</td>
                      <td className="px-4 py-2.5 text-center text-red-600">{a.absent}</td>
                      <td className="px-4 py-2.5">
                        <form action={removeL113Student} className="flex justify-end">
                          <input type="hidden" name="batchId" value={batch.id} />
                          <input type="hidden" name="vgLeaderId" value={s.vgLeaderId} />
                          <button type="submit" className="text-xs text-red-600 hover:text-red-800 font-medium">
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-6 text-sm text-gray-400 text-center">No students yet. Add them from Potential L113 Students below.</p>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Add Students from Potential L113 Students"
          subtitle="Claimed, actively leading VG leaders done with the Discipleship Journey who haven't graduated from or started L113."
        />
        <AddStudentsForm key={addable.length} batchId={batch.id} candidates={addable} />
      </Card>
    </>
  );
}

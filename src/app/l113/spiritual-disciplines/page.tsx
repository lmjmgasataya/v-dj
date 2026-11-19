import { db } from "@/db";
import { l113SpiritualDisciplines } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getL113FormStudents } from "@/lib/l113Data";
import { batchMonths, defaultBatchMonth, l113StudentKey } from "@/lib/l113";
import { todayPH } from "@/lib/date";
import { FormHeader, FormNotice } from "../ui";
import { SpiritualDisciplinesForm } from "./SpiritualDisciplinesForm";

export const metadata = { title: "Spiritual Disciplines Calendar · Leadership 113" };

/** Public form (one link for every student). Answers are never shown back, only which months are in. */
export default async function SpiritualDisciplinesFormPage() {
  const [{ batches, students }, session] = await Promise.all([getL113FormStudents(), getSession()]);
  const submittedRows = batches.length
    ? await db
        .select({ batchId: l113SpiritualDisciplines.batchId, vgLeaderId: l113SpiritualDisciplines.vgLeaderId, month: l113SpiritualDisciplines.month })
        .from(l113SpiritualDisciplines)
        .where(inArray(l113SpiritualDisciplines.batchId, batches.map((b) => b.id)))
    : [];
  const submitted: Record<string, string[]> = {};
  for (const r of submittedRows) (submitted[l113StudentKey(r.batchId, r.vgLeaderId)] ??= []).push(r.month);

  const today = todayPH();
  const batchInfo = batches.map((b) => {
    const months = batchMonths(b.startDate, b.endDate);
    return { id: b.id, name: b.name, months, defaultMonth: defaultBatchMonth(months, today) };
  });
  // A logged-in VG leader starts with their own name picked.
  const ownKey = session?.role === "vg_leader" ? students.find((s) => s.vgLeaderId === session.vgLeaderId)?.key : undefined;

  return (
    <div className="flex flex-col gap-5">
      <FormHeader
        title="Spiritual Disciplines Calendar"
        description="Select your name and the month, then answer the four questions. You can come back and update a month you already submitted."
      />
      {students.length === 0 ? (
        <FormNotice>There are no Leadership 113 students yet.</FormNotice>
      ) : (
        <SpiritualDisciplinesForm batches={batchInfo} students={students} submitted={submitted} initialStudent={ownKey ?? ""} />
      )}
    </div>
  );
}

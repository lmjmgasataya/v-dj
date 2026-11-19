"use server";

import { db } from "@/db";
import { l113ScheduleDates, l113Schedules, l113Teachers, l113Topics } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireL113Admin } from "@/lib/l113Data";
import { toastRedirectBack } from "@/lib/toast";

function cleanName(raw: FormDataEntryValue | null) {
  return String(raw ?? "").trim().replace(/\s+/g, " ").slice(0, 160);
}

/** The topic with this name (ignoring case), added to l113Topics if it's new. */
async function findOrCreateTopic(name: string): Promise<number> {
  const find = () =>
    db.select({ id: l113Topics.id }).from(l113Topics).where(sql`lower(${l113Topics.name}) = lower(${name})`).limit(1);
  const [existing] = await find();
  if (existing) return existing.id;
  const [created] = await db.insert(l113Topics).values({ name }).onConflictDoNothing().returning({ id: l113Topics.id });
  return created?.id ?? (await find())[0].id;
}

async function readScheduleFields(formData: FormData) {
  const topicName = cleanName(formData.get("topic"));
  const isBreak = formData.get("isBreak") === "on";
  const teacherId = Number(formData.get("teacherId"));
  const remarks = String(formData.get("remarks") ?? "").trim().slice(0, 300) || null;
  const dates = [...new Set(formData.getAll("classDate").map(String).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  if (!topicName) return { error: "Enter the topic." } as const;
  if (dates.length === 0) return { error: "Add at least one date." } as const;
  let teacher: number | null = null;
  if (!isBreak) {
    const [row] =
      Number.isInteger(teacherId) && teacherId > 0
        ? await db.select({ id: l113Teachers.id }).from(l113Teachers).where(eq(l113Teachers.id, teacherId)).limit(1)
        : [];
    if (!row) return { error: "Pick a teacher/facilitator from the list." } as const;
    teacher = row.id;
  }
  return { topicId: await findOrCreateTopic(topicName), teacherId: teacher, isBreak, remarks, dates } as const;
}

function revalidate() {
  revalidatePath("/l113-portal/schedule");
  revalidatePath("/l113-portal/topics");
}

export async function createL113Schedule(formData: FormData) {
  await requireL113Admin();
  const batchId = Number(formData.get("batchId"));
  const fields = await readScheduleFields(formData);
  if ("error" in fields) return toastRedirectBack(fields.error!, "error");
  const { dates, ...values } = fields;
  await db.transaction(async (tx) => {
    const [schedule] = await tx.insert(l113Schedules).values({ batchId, ...values }).returning({ id: l113Schedules.id });
    await tx.insert(l113ScheduleDates).values(dates.map((classDate) => ({ scheduleId: schedule.id, classDate })));
  });
  revalidate();
  await toastRedirectBack(fields.isBreak ? "Break added to the schedule." : "Topic added to the schedule.");
}

/**
 * Dates kept stay as they are (with their check-ins); removed dates are deleted with their
 * check-ins; new dates are added.
 */
export async function updateL113Schedule(formData: FormData) {
  await requireL113Admin();
  const id = Number(formData.get("id"));
  const fields = await readScheduleFields(formData);
  if ("error" in fields) return toastRedirectBack(fields.error!, "error");
  const [existing] = await db.select({ id: l113Schedules.id }).from(l113Schedules).where(eq(l113Schedules.id, id)).limit(1);
  if (!existing) return toastRedirectBack("That row no longer exists.", "error");
  const { dates, ...values } = fields;

  await db.transaction(async (tx) => {
    await tx.update(l113Schedules).set(values).where(eq(l113Schedules.id, id));
    const current = await tx.select().from(l113ScheduleDates).where(eq(l113ScheduleDates.scheduleId, id));
    const removed = current.filter((d) => !dates.includes(d.classDate)).map((d) => d.id);
    const added = dates.filter((d) => !current.some((c) => c.classDate === d));
    if (removed.length) {
      await tx.delete(l113ScheduleDates).where(and(eq(l113ScheduleDates.scheduleId, id), inArray(l113ScheduleDates.id, removed)));
    }
    if (added.length) {
      await tx.insert(l113ScheduleDates).values(added.map((classDate) => ({ scheduleId: id, classDate })));
    }
  });
  revalidate();
  await toastRedirectBack("Schedule updated.");
}

export async function deleteL113Schedule(formData: FormData) {
  await requireL113Admin();
  await db.delete(l113Schedules).where(eq(l113Schedules.id, Number(formData.get("id"))));
  revalidate();
  await toastRedirectBack("Deleted from the schedule.");
}

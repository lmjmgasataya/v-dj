"use server";

import { db } from "@/db";
import { l113Schedules, l113Topics } from "@/db/schema";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireL113Admin } from "@/lib/l113Data";
import { toastRedirectBack } from "@/lib/toast";

function readName(formData: FormData) {
  return String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 160);
}

async function nameTaken(name: string, exceptId?: number) {
  const same = sql`lower(${l113Topics.name}) = lower(${name})`;
  const [row] = await db
    .select({ id: l113Topics.id })
    .from(l113Topics)
    .where(exceptId ? and(same, ne(l113Topics.id, exceptId)) : same)
    .limit(1);
  return !!row;
}

function revalidate() {
  revalidatePath("/l113-portal/topics");
  revalidatePath("/l113-portal/schedule");
}

export async function createL113Topic(formData: FormData) {
  await requireL113Admin();
  const name = readName(formData);
  if (!name) return toastRedirectBack("Enter the topic.", "error");
  if (await nameTaken(name)) return toastRedirectBack(`"${name}" is already on the list.`, "error");
  await db.insert(l113Topics).values({ name });
  revalidate();
  await toastRedirectBack(`"${name}" added.`);
}

/** Renaming shows the new name on every batch's schedule that uses it. */
export async function updateL113Topic(formData: FormData) {
  await requireL113Admin();
  const id = Number(formData.get("id"));
  const name = readName(formData);
  if (!name) return toastRedirectBack("Enter the topic.", "error");
  if (await nameTaken(name, id)) return toastRedirectBack(`"${name}" is already on the list.`, "error");
  await db.update(l113Topics).set({ name }).where(eq(l113Topics.id, id));
  revalidate();
  await toastRedirectBack("Topic updated.");
}

/** Only topics no schedule uses can be deleted. */
export async function deleteL113Topic(formData: FormData) {
  await requireL113Admin();
  const id = Number(formData.get("id"));
  const [used] = await db.select({ n: count() }).from(l113Schedules).where(eq(l113Schedules.topicId, id));
  if (used.n > 0) {
    return toastRedirectBack(`Can't delete: used ${used.n} time${used.n === 1 ? "" : "s"} on a schedule. Remove it from the schedule first.`, "error");
  }
  await db.delete(l113Topics).where(eq(l113Topics.id, id));
  revalidate();
  await toastRedirectBack("Topic deleted.");
}

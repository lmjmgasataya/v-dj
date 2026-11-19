"use server";

import { db } from "@/db";
import { l113Schedules, l113TeacherEvaluations, l113Teachers } from "@/db/schema";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireL113Admin } from "@/lib/l113Data";
import { toastRedirectBack } from "@/lib/toast";

function readName(formData: FormData) {
  return String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
}

/** Another teacher already has this name (ignoring case)? */
async function nameTaken(name: string, exceptId?: number) {
  const same = sql`lower(${l113Teachers.name}) = lower(${name})`;
  const [row] = await db
    .select({ id: l113Teachers.id })
    .from(l113Teachers)
    .where(exceptId ? and(same, ne(l113Teachers.id, exceptId)) : same)
    .limit(1);
  return !!row;
}

function revalidate() {
  revalidatePath("/l113-portal/teachers");
  revalidatePath("/l113-portal/schedule");
}

export async function createL113Teacher(formData: FormData) {
  await requireL113Admin();
  const name = readName(formData);
  if (!name) return toastRedirectBack("Enter the teacher's name.", "error");
  if (await nameTaken(name)) return toastRedirectBack(`${name} is already on the list.`, "error");
  await db.insert(l113Teachers).values({ name });
  revalidate();
  await toastRedirectBack(`${name} added.`);
}

/** Renaming shows the new name everywhere, including past schedules and evaluations. */
export async function updateL113Teacher(formData: FormData) {
  await requireL113Admin();
  const id = Number(formData.get("id"));
  const name = readName(formData);
  if (!name) return toastRedirectBack("Enter the teacher's name.", "error");
  if (await nameTaken(name, id)) return toastRedirectBack(`${name} is already on the list.`, "error");
  await db.update(l113Teachers).set({ name }).where(eq(l113Teachers.id, id));
  revalidate();
  await toastRedirectBack("Teacher updated.");
}

/** Only teachers with no topics and no evaluations can be deleted. */
export async function deleteL113Teacher(formData: FormData) {
  await requireL113Admin();
  const id = Number(formData.get("id"));
  const [[topics], [evals]] = await Promise.all([
    db.select({ n: count() }).from(l113Schedules).where(eq(l113Schedules.teacherId, id)),
    db.select({ n: count() }).from(l113TeacherEvaluations).where(eq(l113TeacherEvaluations.teacherId, id)),
  ]);
  if (topics.n > 0 || evals.n > 0) {
    return toastRedirectBack(
      topics.n > 0
        ? `Can't delete: assigned to ${topics.n} topic${topics.n === 1 ? "" : "s"}. Change those topics' teacher first.`
        : "Can't delete: students have already evaluated this teacher.",
      "error"
    );
  }
  await db.delete(l113Teachers).where(eq(l113Teachers.id, id));
  revalidate();
  await toastRedirectBack("Teacher deleted.");
}

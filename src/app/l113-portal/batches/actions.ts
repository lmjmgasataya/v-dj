"use server";

import { db } from "@/db";
import { l113Batches, l113BatchStudents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireL113Admin } from "@/lib/l113Data";
import { toastRedirect, toastRedirectBack } from "@/lib/toast";

function readBatchFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  if (!name || !startDate || !endDate) return { error: "Name, start date and end date are required." } as const;
  if (endDate < startDate) return { error: "The end date can't be before the start date." } as const;
  return { name, startDate, endDate } as const;
}

export async function createL113Batch(formData: FormData) {
  await requireL113Admin();
  const fields = readBatchFields(formData);
  if ("error" in fields) return toastRedirectBack(fields.error!, "error");
  const [batch] = await db.insert(l113Batches).values(fields).returning({ id: l113Batches.id });
  revalidatePath("/l113-portal/batches");
  toastRedirect(`/l113-portal/batches/${batch.id}`, "Batch created. Add its students below.");
}

export async function updateL113Batch(formData: FormData) {
  await requireL113Admin();
  const id = Number(formData.get("id"));
  const fields = readBatchFields(formData);
  if ("error" in fields) return toastRedirectBack(fields.error!, "error");
  await db.update(l113Batches).set(fields).where(eq(l113Batches.id, id));
  revalidatePath("/l113-portal/batches");
  await toastRedirectBack("Batch updated.");
}

/** Deletes the batch with its students, schedule, check-ins and evaluations (ON DELETE CASCADE). */
export async function deleteL113Batch(formData: FormData) {
  await requireL113Admin();
  await db.delete(l113Batches).where(eq(l113Batches.id, Number(formData.get("id"))));
  revalidatePath("/l113-portal/batches");
  toastRedirect("/l113-portal/batches", "Batch deleted.");
}

export async function addL113Students(formData: FormData) {
  await requireL113Admin();
  const batchId = Number(formData.get("batchId"));
  const ids = formData
    .getAll("vgLeaderId")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) return toastRedirectBack("Select at least one student to add.", "error");
  await db
    .insert(l113BatchStudents)
    .values(ids.map((vgLeaderId) => ({ batchId, vgLeaderId })))
    .onConflictDoNothing();
  revalidatePath(`/l113-portal/batches/${batchId}`);
  await toastRedirectBack(`Added ${ids.length} student${ids.length === 1 ? "" : "s"}.`);
}

/** Removes the student from the batch. Their check-ins and evaluations are kept. */
export async function removeL113Student(formData: FormData) {
  await requireL113Admin();
  const batchId = Number(formData.get("batchId"));
  const vgLeaderId = Number(formData.get("vgLeaderId"));
  await db
    .delete(l113BatchStudents)
    .where(and(eq(l113BatchStudents.batchId, batchId), eq(l113BatchStudents.vgLeaderId, vgLeaderId)));
  revalidatePath(`/l113-portal/batches/${batchId}`);
  await toastRedirectBack("Student removed from the batch.");
}

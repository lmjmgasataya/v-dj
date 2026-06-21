"use server";

import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function archiveParticipant(formData: FormData) {
  await requireDeveloper();
  await db.update(participants)
    .set({ deletedAt: new Date() })
    .where(eq(participants.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/participants");
}

export async function restoreParticipant(formData: FormData) {
  await requireDeveloper();
  await db.update(participants)
    .set({ deletedAt: null })
    .where(eq(participants.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/participants");
}

export async function deleteParticipant(formData: FormData) {
  await requireDeveloper();
  await db.delete(participants).where(eq(participants.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/participants");
}

export async function updateWorshipService(id: number, value: string | null) {
  await requireDeveloper();
  await db.update(participants)
    .set({ worshipServiceRegistered: value || null })
    .where(eq(participants.id, id));
  revalidatePath("/devops-admin/participants");
}

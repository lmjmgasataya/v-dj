"use server";

import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toastRedirectBack } from "@/lib/toast";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function createClassSession(formData: FormData) {
  await requireDeveloper();
  await db.insert(classSessions).values({
    name: formData.get("name") as string,
    sessionDate: formData.get("sessionDate") as string,
    isVictoryDay: formData.get("isVictoryDay") === "on",
    requiresVictoryDay: formData.get("requiresVictoryDay") === "on",
    allowsWalkIn: formData.get("allowsWalkIn") === "on",
  });
  revalidatePath("/devops-admin/class-sessions");
  await toastRedirectBack("Class session created.");
}

export async function deleteClassSession(formData: FormData) {
  await requireDeveloper();
  await db.delete(classSessions).where(eq(classSessions.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/class-sessions");
  await toastRedirectBack("Class session deleted.");
}

export async function toggleSessionFlag(formData: FormData) {
  await requireDeveloper();
  const id = Number(formData.get("id"));
  const field = formData.get("field") as string;
  if (field === "isVictoryDay") {
    await db.update(classSessions).set({ isVictoryDay: sql`NOT is_victory_day` }).where(eq(classSessions.id, id));
  } else if (field === "requiresVictoryDay") {
    await db.update(classSessions).set({ requiresVictoryDay: sql`NOT requires_victory_day` }).where(eq(classSessions.id, id));
  } else {
    await db.update(classSessions).set({ allowsWalkIn: sql`NOT allows_walk_in` }).where(eq(classSessions.id, id));
  }
  revalidatePath("/devops-admin/class-sessions");
  await toastRedirectBack("Session updated.");
}

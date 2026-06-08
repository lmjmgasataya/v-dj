"use server";

import { db } from "@/db";
import { disciplers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function createDiscipler(formData: FormData) {
  await requireDeveloper();
  await db.insert(disciplers).values({
    lastName: formData.get("lastName") as string,
    firstName: formData.get("firstName") as string,
    mobileNumber: formData.get("mobileNumber") as string,
    messengerName: (formData.get("messengerName") as string) || null,
  }).onConflictDoNothing();
  revalidatePath("/devops-admin/disciplers");
}

export async function deleteDiscipler(formData: FormData) {
  await requireDeveloper();
  await db.delete(disciplers).where(eq(disciplers.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/disciplers");
}

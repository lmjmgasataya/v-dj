"use server";

import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function createVgLeader(formData: FormData) {
  await requireDeveloper();
  await db.insert(victoryGroupLeaders).values({
    lastName: formData.get("lastName") as string,
    firstName: formData.get("firstName") as string,
    middleInitial: (formData.get("middleInitial") as string) || null,
    mobileNumber: formData.get("mobileNumber") as string,
    facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
  }).onConflictDoNothing();
  revalidatePath("/devops-admin/vg-leaders");
}

export async function deleteVgLeader(formData: FormData) {
  await requireDeveloper();
  await db.delete(victoryGroupLeaders)
    .where(eq(victoryGroupLeaders.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/vg-leaders");
}

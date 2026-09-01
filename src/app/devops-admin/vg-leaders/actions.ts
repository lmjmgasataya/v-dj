"use server";

import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/text";
import { toastRedirectBack } from "@/lib/toast";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function createVgLeader(formData: FormData) {
  await requireDeveloper();
  await db.insert(victoryGroupLeaders).values({
    lastName: toTitleCase(formData.get("lastName") as string),
    firstName: toTitleCase(formData.get("firstName") as string),
    middleInitial: toTitleCase((formData.get("middleInitial") as string) || "") || null,
    mobileNumber: formData.get("mobileNumber") as string,
    facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
    registeredMode: "participant_registration",
  }).onConflictDoNothing();
  revalidatePath("/devops-admin/vg-leaders");
  await toastRedirectBack("VG leader added.");
}

export async function deleteVgLeader(formData: FormData) {
  await requireDeveloper();
  await db.delete(victoryGroupLeaders)
    .where(eq(victoryGroupLeaders.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/vg-leaders");
  await toastRedirectBack("VG leader deleted.");
}

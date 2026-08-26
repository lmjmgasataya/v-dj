"use server";

import { db } from "@/db";
import { victoryGroups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toastRedirectBack } from "@/lib/toast";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function createVgGroup(formData: FormData) {
  await requireDeveloper();
  const frequency = formData.get("frequency") as "Weekly" | "Every other week" | "Once a month" | "Others";
  const lifeStage = (formData.get("lifeStage") as string) || null;
  await db.insert(victoryGroups).values({
    vgLeaderId: Number(formData.get("vgLeaderId")),
    place: formData.get("place") as string,
    day: formData.get("day") as "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
    time: formData.get("time") as string,
    frequency,
    otherFrequency: frequency === "Others" ? (formData.get("otherFrequency") as string) || null : null,
    lifeStage: lifeStage ? [lifeStage as NonNullable<typeof victoryGroups.$inferInsert["lifeStage"]>[number]] : null,
  });
  revalidatePath("/devops-admin/vg-groups");
  await toastRedirectBack("VG group created.");
}

export async function deleteVgGroup(formData: FormData) {
  await requireDeveloper();
  await db.delete(victoryGroups).where(eq(victoryGroups.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/vg-groups");
  await toastRedirectBack("VG group deleted.");
}

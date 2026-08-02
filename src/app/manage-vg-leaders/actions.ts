"use server";

import { db } from "@/db";
import { disciplers, victoryGroupLeaders, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/text";
import { toastRedirectBack } from "@/lib/toast";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function promoteDisciplerToVgLeader(disciplerId: number) {
  await requireDeveloper();
  const [discipler] = await db.select().from(disciplers).where(eq(disciplers.id, disciplerId)).limit(1);
  if (!discipler) return;

  await db
    .insert(victoryGroupLeaders)
    .values({
      lastName: toTitleCase(discipler.lastName),
      firstName: toTitleCase(discipler.firstName),
      mobileNumber: discipler.mobileNumber,
      facebookMessengerName: discipler.messengerName,
    })
    .onConflictDoNothing();

  revalidatePath("/manage-vg-leaders");
  await toastRedirectBack("Discipler promoted to VG leader.");
}

export async function resetVgLeaderSecurityQuestion(userId: number) {
  await requireDeveloper();
  await db
    .update(users)
    .set({ securityQuestion: null, securityAnswerHash: null })
    .where(and(eq(users.id, userId), eq(users.role, "vg_leader")));
  revalidatePath("/manage-vg-leaders");
  await toastRedirectBack(
    "Security question cleared. The leader will be asked to set a new one next time they access the portal."
  );
}

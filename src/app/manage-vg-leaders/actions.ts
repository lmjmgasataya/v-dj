"use server";

import { db } from "@/db";
import { disciplers, victoryGroupLeaders, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
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

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function resetVgLeaderPassword(userId: number) {
  await requireDeveloper();
  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 10);
  await db
    .update(users)
    .set({ passwordHash: hash, mustChangePassword: true })
    .where(and(eq(users.id, userId), eq(users.role, "vg_leader")));
  revalidatePath("/manage-vg-leaders");
  await toastRedirectBack(
    `Temporary password: ${tempPassword} — share this with the leader. They'll be asked to set a new one on next login.`
  );
}

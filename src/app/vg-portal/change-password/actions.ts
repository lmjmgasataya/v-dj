"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getSession, signSession, setSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function changePassword(_: unknown, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "vg_leader") redirect("/");

  const currentPassword = (formData.get("currentPassword") as string) ?? "";
  const newPassword = (formData.get("newPassword") as string) ?? "";

  if (newPassword.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) redirect("/login");

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false })
    .where(eq(users.id, user.id));

  const token = await signSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: "vg_leader",
    vgLeaderId: user.vgLeaderId ?? undefined,
    mustChangePassword: false,
  });
  await setSessionCookie(token);
  redirect("/vg-portal");
}

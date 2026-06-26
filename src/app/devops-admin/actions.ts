"use server";

import { db } from "@/db";
import { featureFlags, smsApiKeys, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession, type Role } from "@/lib/auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
  return session;
}

export async function toggleFlag(key: string) {
  await requireDeveloper();
  await db
    .insert(featureFlags)
    .values({ key, enabled: true })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled: sql`NOT ${featureFlags.enabled}`, updatedAt: new Date() },
    });
  revalidatePath("/devops-admin");
}

export async function createFlag(formData: FormData) {
  await requireDeveloper();
  const key = (formData.get("key") as string ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!key || !/^[a-z0-9_]+$/.test(key)) return;
  await db.insert(featureFlags).values({ key, enabled: false }).onConflictDoNothing();
  revalidatePath("/devops-admin");
}

export async function deleteFlag(key: string) {
  await requireDeveloper();
  await db.delete(featureFlags).where(eq(featureFlags.key, key));
  revalidatePath("/devops-admin");
}

export async function changeRole(formData: FormData) {
  await requireDeveloper();
  const userId = Number(formData.get("userId"));
  const role = formData.get("role") as Role;
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/devops-admin");
}

export async function resetPassword(formData: FormData) {
  await requireDeveloper();
  const userId = Number(formData.get("userId"));
  const newPassword = formData.get("newPassword") as string;
  if (!newPassword || newPassword.length < 6) return;
  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, userId));
  revalidatePath("/devops-admin");
}

export async function deleteUser(formData: FormData) {
  const session = await requireDeveloper();
  const userId = Number(formData.get("userId"));
  if (userId === session.userId) return;
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/devops-admin");
}

export async function createSmsApiKey(formData: FormData) {
  await requireDeveloper();
  const name = (formData.get("name") as string ?? "").trim();
  const apiKey = (formData.get("apiKey") as string ?? "").trim();
  const endpoint = (formData.get("endpoint") as string ?? "").trim() || "https://www.traccar.org/sms";
  if (!name || !apiKey) return;
  await db.insert(smsApiKeys).values({ name, apiKey, endpoint });
  revalidatePath("/devops-admin");
}

export async function deleteSmsApiKey(id: number) {
  await requireDeveloper();
  await db.delete(smsApiKeys).where(eq(smsApiKeys.id, id));
  revalidatePath("/devops-admin");
}

export async function setSmsApiKeyDefault(id: number) {
  await requireDeveloper();
  await db.transaction(async (tx) => {
    await tx.update(smsApiKeys).set({ isDefault: false });
    await tx.update(smsApiKeys).set({ isDefault: true }).where(eq(smsApiKeys.id, id));
  });
  revalidatePath("/devops-admin");
}

export async function createUser(formData: FormData) {
  await requireDeveloper();
  const username = (formData.get("username") as string).trim();
  const name = (formData.get("name") as string).trim();
  const password = formData.get("password") as string;
  const role = formData.get("role") as Role;
  if (!username || !name || !password || password.length < 6) return;
  const hash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ username, name, passwordHash: hash, role }).onConflictDoNothing();
  revalidatePath("/devops-admin");
}

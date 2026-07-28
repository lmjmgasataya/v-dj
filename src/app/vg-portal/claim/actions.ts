"use server";

import { db } from "@/db";
import { victoryGroupLeaders, users, featureFlags } from "@/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signSession, setSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

function normalizeDigits(s: string) {
  return s.replace(/\D/g, "");
}

export async function verifyIdentity(_: unknown, formData: FormData) {
  const lastName = ((formData.get("lastName") as string) ?? "").trim();
  const last6 = normalizeDigits((formData.get("mobileLast6") as string) ?? "");

  if (!lastName || last6.length !== 6) {
    return { error: "Enter your last name and the last 6 digits of your mobile number." };
  }

  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, "vg_leader_portal"))
    .limit(1);
  if (!(flag?.enabled ?? false)) {
    return { error: "This portal isn't available right now. Please contact an admin." };
  }

  const candidates = await db
    .select()
    .from(victoryGroupLeaders)
    .where(and(ilike(victoryGroupLeaders.lastName, lastName), isNull(victoryGroupLeaders.deletedAt)));

  const matches = candidates.filter((c) => normalizeDigits(c.mobileNumber).endsWith(last6));

  if (matches.length !== 1) {
    return { error: "No match found. Please contact an admin to check your details." };
  }

  const leader = matches[0];

  const [existingAccount] = await db
    .select()
    .from(users)
    .where(eq(users.vgLeaderId, leader.id))
    .limit(1);
  if (existingAccount) {
    return { error: "This account is already set up — please log in instead." };
  }

  return {
    verified: true as const,
    vgLeaderId: leader.id,
    name: `${leader.firstName} ${leader.lastName}`,
  };
}

export async function completeClaim(vgLeaderId: number, _: unknown, formData: FormData) {
  const username = ((formData.get("username") as string) ?? "").trim();
  const password = (formData.get("password") as string) ?? "";

  if (!username || password.length < 6) {
    return { error: "Choose a username and a password with at least 6 characters." };
  }

  const [leader] = await db
    .select()
    .from(victoryGroupLeaders)
    .where(eq(victoryGroupLeaders.id, vgLeaderId))
    .limit(1);
  if (!leader) return { error: "Something went wrong. Please start over." };

  const [existingAccount] = await db
    .select()
    .from(users)
    .where(eq(users.vgLeaderId, vgLeaderId))
    .limit(1);
  if (existingAccount) return { error: "This account is already set up — please log in instead." };

  const [existingUsername] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existingUsername) return { error: "That username is taken. Please choose another." };

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      name: `${leader.firstName} ${leader.lastName}`,
      role: "vg_leader",
      vgLeaderId,
    })
    .returning();

  const token = await signSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: "vg_leader",
    vgLeaderId,
    mustChangePassword: false,
  });
  await setSessionCookie(token);
  redirect("/vg-portal");
}

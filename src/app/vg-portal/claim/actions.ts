"use server";

import { db } from "@/db";
import { victoryGroupLeaders, users, featureFlags } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signSession, setSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/text";
import { normalizeName } from "@/lib/vgLeaderMatch";
import { isValidPin } from "@/lib/pin";

function safeCallback(callbackUrl: string | null): string {
  if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) return callbackUrl;
  return "/vg-portal";
}

async function isPortalEnabled() {
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, "vg_leader_portal"))
    .limit(1);
  return flag?.enabled ?? false;
}

/**
 * Leaders whose name matches what was typed, ignoring case, accents ("Peñas" = "Penas") and
 * dots ("Ma. Anna" = "Ma Anna"). A full first-name match wins; otherwise falls back to the
 * first word of the first name ("Juan" finds "Juan Carlos").
 */
async function findLeaderMatches(firstName: string, lastName: string) {
  const last = normalizeName(lastName);
  const first = normalizeName(firstName);
  if (!last || !first) return [];

  // Normalized comparison can't be done with ilike (ñ vs n), so filter in JS.
  const leaders = await db
    .select()
    .from(victoryGroupLeaders)
    .where(isNull(victoryGroupLeaders.deletedAt));
  const sameLast = leaders.filter((l) => normalizeName(l.lastName) === last);

  const exact = sameLast.filter((l) => normalizeName(l.firstName) === first);
  if (exact.length > 0) return exact;

  const enteredFirstWord = first.split(" ")[0];
  return sameLast.filter((l) => normalizeName(l.firstName).split(" ")[0] === enteredFirstWord);
}

export async function checkIdentity(_: unknown, formData: FormData) {
  const firstName = ((formData.get("firstName") as string) ?? "").trim();
  const lastName = ((formData.get("lastName") as string) ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "Enter your first name and last name." };
  }

  if (!(await isPortalEnabled())) {
    return { error: "This portal isn't available right now. Please contact an admin." };
  }

  const matches = await findLeaderMatches(firstName, lastName);

  if (matches.length !== 1) {
    return { checked: true as const, matched: false as const, firstName, lastName };
  }

  const leader = matches[0];
  const name = `${leader.firstName} ${leader.lastName}`;

  const [existingAccount] = await db
    .select()
    .from(users)
    .where(eq(users.vgLeaderId, leader.id))
    .limit(1);

  if (existingAccount?.pinHash) {
    return { checked: true as const, matched: true as const, mode: "login" as const, vgLeaderId: leader.id, name };
  }

  return { checked: true as const, matched: true as const, mode: "setup" as const, vgLeaderId: leader.id, name };
}

function parsePins(formData: FormData) {
  const pin = ((formData.get("pin") as string) ?? "").trim();
  const confirmPin = ((formData.get("confirmPin") as string) ?? "").trim();
  return { pin, confirmPin };
}

export async function setupPin(vgLeaderId: number, callbackUrl: string | null, _: unknown, formData: FormData) {
  const { pin, confirmPin } = parsePins(formData);

  if (!isValidPin(pin)) return { error: "Enter a 5-digit PIN." };
  if (pin !== confirmPin) return { error: "Your PINs don't match. Please try again." };

  const [leader] = await db
    .select()
    .from(victoryGroupLeaders)
    .where(eq(victoryGroupLeaders.id, vgLeaderId))
    .limit(1);
  if (!leader) return { error: "Something went wrong. Please start over." };

  const pinHash = await bcrypt.hash(pin, 10);
  const name = `${leader.firstName} ${leader.lastName}`;

  const [existingAccount] = await db
    .select()
    .from(users)
    .where(eq(users.vgLeaderId, vgLeaderId))
    .limit(1);

  let user: typeof users.$inferSelect;
  if (existingAccount) {
    [user] = await db.update(users).set({ pinHash }).where(eq(users.id, existingAccount.id)).returning();
  } else {
    [user] = await db
      .insert(users)
      .values({ name, role: "vg_leader", vgLeaderId, pinHash })
      .returning();
  }

  const token = await signSession({ userId: user.id, name: user.name, role: "vg_leader", vgLeaderId });
  await setSessionCookie(token);
  redirect(safeCallback(callbackUrl));
}

export async function verifyPin(vgLeaderId: number, callbackUrl: string | null, _: unknown, formData: FormData) {
  const pin = ((formData.get("pin") as string) ?? "").trim();
  if (!isValidPin(pin)) return { error: "Enter your 5-digit PIN." };

  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.vgLeaderId, vgLeaderId))
    .limit(1);

  if (!account?.pinHash) return { error: "Something went wrong. Please start over." };

  const match = await bcrypt.compare(pin, account.pinHash);
  if (!match) return { error: "That PIN doesn't match. Please try again." };

  const token = await signSession({ userId: account.id, name: account.name, role: "vg_leader", vgLeaderId });
  await setSessionCookie(token);
  redirect(safeCallback(callbackUrl));
}

export async function registerNewLeader(firstName: string, lastName: string, callbackUrl: string | null, _: unknown, formData: FormData) {
  const { pin, confirmPin } = parsePins(formData);

  if (!isValidPin(pin)) return { error: "Enter a 5-digit PIN." };
  if (pin !== confirmPin) return { error: "Your PINs don't match. Please try again." };

  if (!(await isPortalEnabled())) {
    return { error: "This portal isn't available right now. Please contact an admin." };
  }

  // Don't create a duplicate when the name already identifies an existing leader
  // (e.g. typed "Penas" for "Peñas") — they should log in to that account instead.
  if ((await findLeaderMatches(firstName, lastName)).length === 1) {
    return { error: "An account with this name already exists. Please go back and log in." };
  }

  const titleFirstName = toTitleCase(firstName);
  const titleLastName = toTitleCase(lastName);
  const name = `${titleFirstName} ${titleLastName}`;
  const pinHash = await bcrypt.hash(pin, 10);

  const [leader] = await db
    .insert(victoryGroupLeaders)
    .values({ firstName: titleFirstName, lastName: titleLastName, mobileNumber: null, registeredMode: "vgl_portal_registration" })
    .returning();

  const [user] = await db
    .insert(users)
    .values({ name, role: "vg_leader", vgLeaderId: leader.id, pinHash })
    .returning();

  const token = await signSession({ userId: user.id, name: user.name, role: "vg_leader", vgLeaderId: leader.id });
  await setSessionCookie(token);
  redirect(safeCallback(callbackUrl));
}

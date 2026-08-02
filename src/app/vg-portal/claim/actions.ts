"use server";

import { db } from "@/db";
import { victoryGroupLeaders, disciplers, users, featureFlags } from "@/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signSession, setSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SECURITY_QUESTIONS, normalizeSecurityAnswer } from "@/lib/securityQuestions";

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
    // Not found as a VG leader — check if they're on file as a discipler instead. Some
    // disciplers are also VG leaders in practice but don't have a VG leader record yet;
    // we don't auto-create one here (this page is unauthenticated), just point them to an admin.
    const disciplerCandidates = await db
      .select()
      .from(disciplers)
      .where(ilike(disciplers.lastName, lastName));
    const disciplerMatch = disciplerCandidates.some((c) => normalizeDigits(c.mobileNumber).endsWith(last6));

    if (disciplerMatch) {
      return {
        error:
          "You're on file as a discipler but not yet set up as a VG leader. Please contact an admin to be added.",
      };
    }

    return { error: "No match found. Please contact the discipleship admin to check your details." };
  }

  const leader = matches[0];
  const name = `${leader.firstName} ${leader.lastName}`;

  const [existingAccount] = await db
    .select()
    .from(users)
    .where(eq(users.vgLeaderId, leader.id))
    .limit(1);

  if (existingAccount?.securityAnswerHash) {
    return {
      verified: true as const,
      vgLeaderId: leader.id,
      name,
      mode: "answer" as const,
      question: existingAccount.securityQuestion ?? "",
    };
  }

  return { verified: true as const, vgLeaderId: leader.id, name, mode: "setup" as const };
}

export async function setupSecurityQuestion(vgLeaderId: number, _: unknown, formData: FormData) {
  const question = (formData.get("question") as string) ?? "";
  const answer = ((formData.get("answer") as string) ?? "").trim();
  const confirmAnswer = ((formData.get("confirmAnswer") as string) ?? "").trim();

  if (!SECURITY_QUESTIONS.includes(question as (typeof SECURITY_QUESTIONS)[number])) {
    return { error: "Please choose a security question." };
  }
  if (!answer) {
    return { error: "Enter an answer to your security question." };
  }
  if (normalizeSecurityAnswer(answer) !== normalizeSecurityAnswer(confirmAnswer)) {
    return { error: "Your answers don't match. Please try again." };
  }

  const [leader] = await db
    .select()
    .from(victoryGroupLeaders)
    .where(eq(victoryGroupLeaders.id, vgLeaderId))
    .limit(1);
  if (!leader) return { error: "Something went wrong. Please start over." };

  const securityAnswerHash = await bcrypt.hash(normalizeSecurityAnswer(answer), 10);
  const name = `${leader.firstName} ${leader.lastName}`;

  const [existingAccount] = await db
    .select()
    .from(users)
    .where(eq(users.vgLeaderId, vgLeaderId))
    .limit(1);

  let user: typeof users.$inferSelect;
  if (existingAccount) {
    [user] = await db
      .update(users)
      .set({ securityQuestion: question, securityAnswerHash })
      .where(eq(users.id, existingAccount.id))
      .returning();
  } else {
    [user] = await db
      .insert(users)
      .values({
        name,
        role: "vg_leader",
        vgLeaderId,
        securityQuestion: question,
        securityAnswerHash,
      })
      .returning();
  }

  const token = await signSession({
    userId: user.id,
    name: user.name,
    role: "vg_leader",
    vgLeaderId,
  });
  await setSessionCookie(token);
  redirect("/vg-portal");
}

export async function answerSecurityQuestion(vgLeaderId: number, _: unknown, formData: FormData) {
  const answer = ((formData.get("answer") as string) ?? "").trim();
  if (!answer) return { error: "Enter your answer." };

  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.vgLeaderId, vgLeaderId))
    .limit(1);

  if (!account?.securityAnswerHash) return { error: "Something went wrong. Please start over." };

  const match = await bcrypt.compare(normalizeSecurityAnswer(answer), account.securityAnswerHash);
  if (!match) return { error: "That answer doesn't match. Please try again." };

  const token = await signSession({
    userId: account.id,
    name: account.name,
    role: "vg_leader",
    vgLeaderId,
  });
  await setSessionCookie(token);
  redirect("/vg-portal");
}

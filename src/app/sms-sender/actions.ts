"use server";

import { db } from "@/db";
import { participants, disciplers, victoryGroupLeaders, smsMessageTemplates, classSessions, smsApiKeys } from "@/db/schema";
import { eq, isNull, and, isNotNull, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function getSessionsByBatch(batchId: number) {
  return db
    .select({
      id: classSessions.id,
      name: classSessions.name,
      sessionDate: classSessions.sessionDate,
      isVictoryDay: classSessions.isVictoryDay,
    })
    .from(classSessions)
    .where(eq(classSessions.batchId, batchId))
    .orderBy(classSessions.sessionDate);
}

export async function getMessageTemplates() {
  return db
    .select({ id: smsMessageTemplates.id, title: smsMessageTemplates.title, message: smsMessageTemplates.message })
    .from(smsMessageTemplates)
    .orderBy(desc(smsMessageTemplates.id));
}

export async function getParticipantsByBatch(batchId: number) {
  return db
    .select({
      id: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      mobileNumber: participants.mobileNumber,
      registrationFee: participants.registrationFee,
    })
    .from(participants)
    .where(
      and(
        eq(participants.batchId, batchId),
        isNull(participants.deletedAt)
      )
    )
    .orderBy(participants.lastName, participants.firstName);
}

export async function getDisciplersByBatch(batchId: number) {
  return db
    .selectDistinct({
      id: disciplers.id,
      lastName: disciplers.lastName,
      firstName: disciplers.firstName,
      mobileNumber: disciplers.mobileNumber,
    })
    .from(disciplers)
    .innerJoin(participants, eq(participants.disciplerId, disciplers.id))
    .where(
      and(
        eq(participants.batchId, batchId),
        isNull(participants.deletedAt),
        isNotNull(participants.disciplerId)
      )
    )
    .orderBy(disciplers.lastName, disciplers.firstName);
}

export async function getVGLeadersByBatch(batchId: number) {
  return db
    .selectDistinct({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      mobileNumber: victoryGroupLeaders.mobileNumber,
    })
    .from(victoryGroupLeaders)
    .innerJoin(participants, eq(participants.vgLeaderId, victoryGroupLeaders.id))
    .where(
      and(
        eq(participants.batchId, batchId),
        isNull(participants.deletedAt),
        isNotNull(participants.vgLeaderId)
      )
    )
    .orderBy(victoryGroupLeaders.lastName, victoryGroupLeaders.firstName);
}

export async function updateSmsApiKeyEndpoint(id: number, endpoint: string) {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const trimmed = endpoint.trim();
  if (!trimmed) return;

  await db.update(smsApiKeys).set({ endpoint: trimmed }).where(eq(smsApiKeys.id, id));
  revalidatePath("/sms-sender");
}

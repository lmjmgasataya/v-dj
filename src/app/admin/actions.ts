"use server";

import { db } from "@/db";
import { participants, checkIns } from "@/db/schema";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function checkInParticipant(participantId: number, classSessionId: number) {
  await db
    .insert(checkIns)
    .values({ participantId, classSessionId })
    .onConflictDoNothing();
  revalidatePath("/admin");
  revalidatePath("/sessions");
}

export async function removeCheckIn(participantId: number, classSessionId: number) {
  await db
    .delete(checkIns)
    .where(and(eq(checkIns.participantId, participantId), eq(checkIns.classSessionId, classSessionId)));
  revalidatePath("/admin");
  revalidatePath("/sessions");
}

export async function getSessionCheckIns(sessionId: number) {
  return db
    .select({
      id: checkIns.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      middleInitial: participants.middleInitial,
      isWalkIn: participants.isWalkIn,
      checkedInAt: checkIns.checkedInAt,
    })
    .from(checkIns)
    .innerJoin(participants, eq(checkIns.participantId, participants.id))
    .where(eq(checkIns.classSessionId, sessionId))
    .orderBy(checkIns.checkedInAt);
}

export async function searchParticipants(sessionId: number, q: string) {
  if (!q.trim()) return [];
  return db
    .select({
      id: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      middleInitial: participants.middleInitial,
      mobileNumber: participants.mobileNumber,
      lifestage: participants.lifestage,
      preferredNameOnId: participants.preferredNameOnId,
      checkInId: checkIns.id,
      checkedInAt: checkIns.checkedInAt,
    })
    .from(participants)
    .leftJoin(
      checkIns,
      and(
        eq(checkIns.participantId, participants.id),
        eq(checkIns.classSessionId, sessionId)
      )
    )
    .where(
      and(
        isNull(participants.deletedAt),
        or(
          ilike(participants.lastName, `%${q}%`),
          ilike(participants.firstName, `%${q}%`),
          ilike(participants.mobileNumber, `%${q}%`)
        )
      )
    )
    .orderBy(participants.lastName)
    .limit(30);
}

export async function addWalkIn(classSessionId: number, formData: FormData) {
  const [inserted] = await db
    .insert(participants)
    .values({
      lastName: formData.get("lastName") as string,
      firstName: formData.get("firstName") as string,
      middleInitial: (formData.get("middleInitial") as string) || null,
      age: Number(formData.get("age")),
      gender: formData.get("gender") as string,
      serviceAttending: formData.get("serviceAttending") as string,
      facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
      vgLeaderLastName: formData.get("vgLeaderLastName") as string,
      vgLeaderFirstName: formData.get("vgLeaderFirstName") as string,
      victoryDate: formData.get("victoryDate") as string,
      isWalkIn: true,
    })
    .returning({ id: participants.id });

  await db.insert(checkIns).values({ participantId: inserted.id, classSessionId }).onConflictDoNothing();

  revalidatePath("/admin");
  revalidatePath("/participants");
  revalidatePath("/sessions");
}

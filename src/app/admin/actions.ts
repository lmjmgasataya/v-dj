"use server";

import { db } from "@/db";
import { participants, checkIns, classSessions, type lifestageEnum } from "@/db/schema";

type Lifestage = (typeof lifestageEnum.enumValues)[number];
import { and, count, eq, gte, ilike, inArray, isNull, lt, or } from "drizzle-orm";
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
  const rows = await db
    .select({
      id: checkIns.id,
      participantId: checkIns.participantId,
      lastName: participants.lastName,
      firstName: participants.firstName,
      middleInitial: participants.middleInitial,
      isWalkIn: participants.isWalkIn,
      victoryDate: participants.victoryDate,
      checkedInAt: checkIns.checkedInAt,
    })
    .from(checkIns)
    .innerJoin(participants, eq(checkIns.participantId, participants.id))
    .where(eq(checkIns.classSessionId, sessionId))
    .orderBy(checkIns.checkedInAt);

  if (rows.length === 0) return [];

  const participantIds = rows.map((r) => r.participantId);
  const victoryCheckIns = await db
    .select({ participantId: checkIns.participantId, sessionDate: classSessions.sessionDate })
    .from(checkIns)
    .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
    .where(and(inArray(checkIns.participantId, participantIds), eq(classSessions.isVictoryDay, true)));

  const victoryDayMap = Object.fromEntries(victoryCheckIns.map((v) => [v.participantId, v.sessionDate]));

  return rows.map((r) => ({ ...r, victoryDayDate: victoryDayMap[r.participantId] ?? null }));
}

export async function searchParticipants(sessionId: number, q: string) {
  if (!q.trim()) return [];
  const rows = await db
    .select({
      id: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      middleInitial: participants.middleInitial,
      mobileNumber: participants.mobileNumber,
      lifestage: participants.lifestage,
      gender: participants.gender,
      preferredNameOnId: participants.preferredNameOnId,
      isWalkIn: participants.isWalkIn,
      victoryDate: participants.victoryDate,
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

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const year = new Date().getFullYear();
  const [{ totalVictoryDaySessions }] = await db
    .select({ totalVictoryDaySessions: count() })
    .from(classSessions)
    .where(
      and(
        eq(classSessions.isVictoryDay, true),
        gte(classSessions.sessionDate, `${year}-01-01`),
        lt(classSessions.sessionDate, `${year + 1}-01-01`)
      )
    );

  const victoryCheckIns = await db
    .select({ participantId: checkIns.participantId, sessionDate: classSessions.sessionDate })
    .from(checkIns)
    .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
    .where(and(inArray(checkIns.participantId, ids), eq(classSessions.isVictoryDay, true)));

  const victoryCountMap: Record<number, string> = {};
  const victoryAttendanceCount: Record<number, number> = {};
  for (const v of victoryCheckIns) {
    victoryCountMap[v.participantId] ??= v.sessionDate;
    victoryAttendanceCount[v.participantId] = (victoryAttendanceCount[v.participantId] ?? 0) + 1;
  }

  return rows.map((r) => ({
    ...r,
    victoryDayDate: victoryCountMap[r.id] ?? null,
    completedVictoryDay: (victoryAttendanceCount[r.id] ?? 0) >= totalVictoryDaySessions,
  }));
}

export async function addWalkIn(classSessionId: number, formData: FormData) {
  const [inserted] = await db
    .insert(participants)
    .values({
      lastName: formData.get("lastName") as string,
      firstName: formData.get("firstName") as string,
      middleInitial: (formData.get("middleInitial") as string) || null,
      mobileNumber: (formData.get("mobileNumber") as string) || null,
      lifestage: ((formData.get("lifestage") as string) || null) as Lifestage | null,
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

"use server";

import { db } from "@/db";
import { participants, checkIns, classSessions, victoryGroupLeaders, type lifestageEnum } from "@/db/schema";
import { currentYearPH } from "@/lib/date";

type Lifestage = (typeof lifestageEnum.enumValues)[number];
import { and, count, eq, gte, ilike, inArray, isNull, lt, notInArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function checkInParticipant(participantId: number, classSessionId: number, remarks?: string) {
  await db
    .insert(checkIns)
    .values({ participantId, classSessionId, remarks: remarks || null })
    .onConflictDoNothing();
  revalidatePath("/admin");
  revalidatePath("/sessions");
}

export async function checkInByQr(
  participantId: number,
  classSessionId: number
): Promise<{ name: string; alreadyCheckedIn: boolean } | { error: string }> {
  const [participant] = await db
    .select({ id: participants.id, firstName: participants.firstName, lastName: participants.lastName })
    .from(participants)
    .where(and(eq(participants.id, participantId), isNull(participants.deletedAt)))
    .limit(1);

  if (!participant) return { error: "Participant not found" };

  const [existing] = await db
    .select({ id: checkIns.id })
    .from(checkIns)
    .where(and(eq(checkIns.participantId, participantId), eq(checkIns.classSessionId, classSessionId)))
    .limit(1);

  if (existing) {
    return { name: `${participant.lastName}, ${participant.firstName}`, alreadyCheckedIn: true };
  }

  await db.insert(checkIns).values({ participantId, classSessionId }).onConflictDoNothing();
  revalidatePath("/admin");
  revalidatePath("/sessions");

  return { name: `${participant.lastName}, ${participant.firstName}`, alreadyCheckedIn: false };
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
      victoryDate: participants.victoryDate,
      checkedInAt: checkIns.checkedInAt,
      remarks: checkIns.remarks,
    })
    .from(checkIns)
    .innerJoin(participants, eq(checkIns.participantId, participants.id))
    .where(eq(checkIns.classSessionId, sessionId))
    .orderBy(checkIns.checkedInAt);

  if (rows.length === 0) return [];

  const participantIds = rows.map((r) => r.participantId);
  const year = currentYearPH();

  const [[{ totalVictoryDaySessions }], victoryCheckIns] = await Promise.all([
    db
      .select({ totalVictoryDaySessions: count() })
      .from(classSessions)
      .where(
        and(
          eq(classSessions.isVictoryDay, true),
          gte(classSessions.sessionDate, `${year}-01-01`),
          lt(classSessions.sessionDate, `${year + 1}-01-01`)
        )
      ),

    db
      .select({ participantId: checkIns.participantId, sessionDate: classSessions.sessionDate })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(and(inArray(checkIns.participantId, participantIds), eq(classSessions.isVictoryDay, true))),
  ]);

  const victoryDayMap: Record<number, string> = {};
  const victoryAttendanceCount: Record<number, number> = {};
  for (const v of victoryCheckIns) {
    victoryDayMap[v.participantId] ??= v.sessionDate;
    victoryAttendanceCount[v.participantId] = (victoryAttendanceCount[v.participantId] ?? 0) + 1;
  }

  return rows.map((r) => ({
    ...r,
    victoryDayDate: victoryDayMap[r.participantId] ?? null,
    completedVictoryDay: (victoryAttendanceCount[r.participantId] ?? 0) >= totalVictoryDaySessions,
  }));
}

export async function searchParticipants(sessionId: number, q: string, isVictoryDay = false) {
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
      checkInRemarks: checkIns.remarks,
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
        ),
        isVictoryDay ? notInArray(participants.registrationFee, ["C", "D"]) : undefined
      )
    )
    .orderBy(participants.lastName)
    .limit(30);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const year = currentYearPH();

  const [[{ totalVictoryDaySessions }], victoryCheckIns] = await Promise.all([
    db
      .select({ totalVictoryDaySessions: count() })
      .from(classSessions)
      .where(
        and(
          eq(classSessions.isVictoryDay, true),
          gte(classSessions.sessionDate, `${year}-01-01`),
          lt(classSessions.sessionDate, `${year + 1}-01-01`)
        )
      ),

    db
      .select({ participantId: checkIns.participantId, sessionDate: classSessions.sessionDate })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(and(inArray(checkIns.participantId, ids), eq(classSessions.isVictoryDay, true))),
  ]);

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
    checkInRemarks: r.checkInRemarks ?? null,
  }));
}

export async function addWalkIn(classSessionId: number, formData: FormData) {
  const vgLeaderLastName = formData.get("vgLeaderLastName") as string;
  const vgLeaderFirstName = formData.get("vgLeaderFirstName") as string;

  const [vgLeaderRecord] = await db
    .select({ id: victoryGroupLeaders.id })
    .from(victoryGroupLeaders)
    .where(and(eq(victoryGroupLeaders.lastName, vgLeaderLastName), eq(victoryGroupLeaders.firstName, vgLeaderFirstName)))
    .limit(1);

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
      vgLeaderId: vgLeaderRecord?.id ?? null,
      victoryDate: formData.get("victoryDate") as string,
      isWalkIn: true,
    })
    .returning({ id: participants.id });

  const remarks = (formData.get("remarks") as string) || null;
  await db.insert(checkIns).values({ participantId: inserted.id, classSessionId, remarks }).onConflictDoNothing();

  revalidatePath("/admin");
  revalidatePath("/participants");
  revalidatePath("/sessions");
}

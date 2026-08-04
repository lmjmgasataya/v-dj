"use server";

import { db } from "@/db";
import { participants, checkIns, classSessions, victoryGroupLeaders, featureFlags, type lifestageEnum, type CheckInStatus } from "@/db/schema";
import { currentYearPH, checkInStatusForDate } from "@/lib/date";
import { toTitleCase } from "@/lib/text";
import { ORIENTATION_ALLOWED_CLASSES } from "@/lib/constants";
import { assignTableNumber } from "@/lib/tables";

type Lifestage = (typeof lifestageEnum.enumValues)[number];
import { and, count, eq, gte, ilike, inArray, isNull, lt, notInArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toastRedirectBack } from "@/lib/toast";

async function isTableAssignmentEnabled(): Promise<boolean> {
  const [flag] = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, "checkin_table_assignment"))
    .limit(1);
  return flag?.enabled ?? true;
}

const CHECKIN_SETTINGS_FLAG_KEYS = ["checkin_confirm_popup", "checkin_autocheckin"] as const;
type CheckinSettingsFlagKey = (typeof CHECKIN_SETTINGS_FLAG_KEYS)[number];

export async function setCheckinFlag(key: CheckinSettingsFlagKey, enabled: boolean) {
  const session = await getSession();
  if (!session || session.role === "vg_leader") redirect("/");
  if (!CHECKIN_SETTINGS_FLAG_KEYS.includes(key)) return;

  await db
    .insert(featureFlags)
    .values({ key, enabled })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedAt: new Date() },
    });

  revalidatePath("/admin");
  await toastRedirectBack("Setting updated.");
}

async function getVictoryDayBlockReason(participantId: number, classSessionId: number): Promise<string | null> {
  const [session] = await db
    .select({ isVictoryDay: classSessions.isVictoryDay, requiresVictoryDay: classSessions.requiresVictoryDay })
    .from(classSessions)
    .where(eq(classSessions.id, classSessionId))
    .limit(1);

  if (!session || session.isVictoryDay || !session.requiresVictoryDay) return null;

  const [participant] = await db
    .select({ victoryDate: participants.victoryDate })
    .from(participants)
    .where(eq(participants.id, participantId))
    .limit(1);

  if (participant?.victoryDate) return null;

  const year = currentYearPH();
  const [[{ totalVictoryDaySessions }], [{ attended }]] = await Promise.all([
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
      .select({ attended: count() })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(and(eq(checkIns.participantId, participantId), eq(classSessions.isVictoryDay, true))),
  ]);

  if (totalVictoryDaySessions > 0 && attended >= totalVictoryDaySessions) return null;
  if (attended > 0) return `Victory Day incomplete (${attended}/${totalVictoryDaySessions})`;
  return "No Victory Day yet";
}

export async function checkInParticipant(
  participantId: number,
  classSessionId: number,
  remarks?: string,
  status?: CheckInStatus
): Promise<{ error: string } | { success: true; tableNumber: number | null }> {
  const blockReason = await getVictoryDayBlockReason(participantId, classSessionId);
  if (blockReason) return { error: blockReason };

  const tableNumber = (await isTableAssignmentEnabled()) ? await assignTableNumber(classSessionId) : null;
  await db
    .insert(checkIns)
    .values({ participantId, classSessionId, remarks: remarks || null, tableNumber, status: status ?? checkInStatusForDate(new Date()) })
    .onConflictDoNothing();
  revalidatePath("/admin");
  revalidatePath("/sessions");
  return { success: true, tableNumber };
}

export async function lookupParticipantForQr(
  participantId: number,
  classSessionId: number,
): Promise<
  | {
      firstName: string;
      lastName: string;
      alreadyCheckedIn: boolean;
      registrationFee: string | null;
      victoryDayBlockReason: string | null;
      tableNumber: number | null;
    }
  | { error: string }
> {
  const [participant] = await db
    .select({
      id: participants.id,
      firstName: participants.firstName,
      lastName: participants.lastName,
      registrationFee: participants.registrationFee,
    })
    .from(participants)
    .where(and(eq(participants.id, participantId), isNull(participants.deletedAt)))
    .limit(1);

  if (!participant) return { error: "Participant not found" };

  const [existing] = await db
    .select({ id: checkIns.id, tableNumber: checkIns.tableNumber })
    .from(checkIns)
    .where(and(eq(checkIns.participantId, participantId), eq(checkIns.classSessionId, classSessionId)))
    .limit(1);

  return {
    firstName: toTitleCase(participant.firstName),
    lastName: toTitleCase(participant.lastName),
    alreadyCheckedIn: !!existing,
    registrationFee: participant.registrationFee,
    tableNumber: existing?.tableNumber ?? null,
    victoryDayBlockReason: existing ? null : await getVictoryDayBlockReason(participantId, classSessionId),
  };
}

export async function checkInByQr(
  participantId: number,
  classSessionId: number,
  remarks?: string,
  status?: CheckInStatus,
): Promise<
  | { firstName: string; lastName: string; alreadyCheckedIn: boolean; tableNumber: number | null }
  | { error: string }
> {
  const [participant] = await db
    .select({ id: participants.id, firstName: participants.firstName, lastName: participants.lastName })
    .from(participants)
    .where(and(eq(participants.id, participantId), isNull(participants.deletedAt)))
    .limit(1);

  if (!participant) return { error: "Participant not found" };

  const firstName = toTitleCase(participant.firstName);
  const lastName = toTitleCase(participant.lastName);

  const [existing] = await db
    .select({ id: checkIns.id, tableNumber: checkIns.tableNumber })
    .from(checkIns)
    .where(and(eq(checkIns.participantId, participantId), eq(checkIns.classSessionId, classSessionId)))
    .limit(1);

  if (existing) {
    return { firstName, lastName, alreadyCheckedIn: true, tableNumber: existing.tableNumber };
  }

  const blockReason = await getVictoryDayBlockReason(participantId, classSessionId);
  if (blockReason) return { error: blockReason };

  const tableNumber = (await isTableAssignmentEnabled()) ? await assignTableNumber(classSessionId) : null;
  await db.insert(checkIns).values({ participantId, classSessionId, remarks: remarks || null, tableNumber, status: status ?? checkInStatusForDate(new Date()) }).onConflictDoNothing();
  revalidatePath("/admin");
  revalidatePath("/sessions");

  return { firstName, lastName, alreadyCheckedIn: false, tableNumber };
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
      tableNumber: checkIns.tableNumber,
      status: checkIns.status,
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
    victoryDayCount: victoryAttendanceCount[r.participantId] ?? 0,
    totalVictoryDaySessions,
    completedVictoryDay: (victoryAttendanceCount[r.participantId] ?? 0) >= totalVictoryDaySessions,
  }));
}

export async function searchParticipants(sessionId: number, q: string, isVictoryDay = false, allowAllClasses = false, isOrientation = false) {
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
      registrationFee: participants.registrationFee,
      checkInId: checkIns.id,
      checkedInAt: checkIns.checkedInAt,
      checkInRemarks: checkIns.remarks,
      tableNumber: checkIns.tableNumber,
      checkInStatus: checkIns.status,
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
        isVictoryDay && !allowAllClasses ? notInArray(participants.registrationFee, ["C", "D"]) : undefined,
        isOrientation ? inArray(participants.registrationFee, ORIENTATION_ALLOWED_CLASSES) : undefined
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
    victoryDayCount: victoryAttendanceCount[r.id] ?? 0,
    totalVictoryDaySessions,
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
      lastName: toTitleCase(formData.get("lastName") as string),
      firstName: toTitleCase(formData.get("firstName") as string),
      middleInitial: toTitleCase((formData.get("middleInitial") as string) || "") || null,
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
  const tableNumber = (await isTableAssignmentEnabled()) ? await assignTableNumber(classSessionId) : null;
  await db.insert(checkIns).values({ participantId: inserted.id, classSessionId, remarks, tableNumber, status: checkInStatusForDate(new Date()) }).onConflictDoNothing();

  revalidatePath("/admin");
  revalidatePath("/participants");
  revalidatePath("/sessions");

  return { tableNumber };
}

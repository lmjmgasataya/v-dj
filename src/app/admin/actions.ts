"use server";

import { db } from "@/db";
import { participants, checkIns, classSessions, victoryGroupLeaders, featureFlags, batches, type lifestageEnum, type CheckInStatus, type CheckInMethod } from "@/db/schema";
import { checkInStatusForDate } from "@/lib/date";
import { toTitleCase } from "@/lib/text";
import { ORIENTATION_ALLOWED_CLASSES } from "@/lib/constants";
import { assignTableNumber } from "@/lib/tables";
import { MOBILE_NUMBER_REGEX } from "@/lib/phone";
import { eligibleForSession, getBatchBlockReason, getSessionBatchScope, getVictoryDayTotalsByBatch, victoryDayTotalFor } from "@/lib/batchCheckIn";

type Lifestage = (typeof lifestageEnum.enumValues)[number];
import { and, count, eq, ilike, inArray, isNull, ne, notInArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { syncJourneyStepsAfterResponse } from "@/lib/djPortalJourney";
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

const CHECKIN_SETTINGS_FLAG_KEYS = ["checkin_confirm_popup", "checkin_autocheckin", "checkin_autocheckin_915", "qr_auto_open_scanner", "offline_checkin"] as const;
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

const VGL_ONLY_BLOCK_REASON = "This session is for active VG leaders only";

// Also the gate for VGL-only sessions and for the session's batch: every participant
// check-in path (search, QR, offline replay) runs through this, so returning a reason
// here blocks them all.
async function getVictoryDayBlockReason(
  participantId: number,
  classSessionId: number
): Promise<string | null> {
  const [[session], [participant]] = await Promise.all([
    db
      .select({
        id: classSessions.id,
        name: classSessions.name,
        batchId: classSessions.batchId,
        batchStart: batches.classStartDate,
        isVictoryDay: classSessions.isVictoryDay,
        requiresVictoryDay: classSessions.requiresVictoryDay,
        vglOnly: classSessions.vglOnly,
      })
      .from(classSessions)
      .leftJoin(batches, eq(classSessions.batchId, batches.id))
      .where(eq(classSessions.id, classSessionId))
      .limit(1),
    db
      .select({ victoryDate: participants.victoryDate, batchId: participants.batchId })
      .from(participants)
      .where(eq(participants.id, participantId))
      .limit(1),
  ]);

  if (session?.vglOnly) return VGL_ONLY_BLOCK_REASON;
  if (!session) return null;

  // Same-batch registrants (the usual case) skip the eligibility query.
  if (participant && session.batchId != null && participant.batchId !== session.batchId) {
    const batchBlockReason = await getBatchBlockReason(participantId, session);
    if (batchBlockReason) return batchBlockReason;
  }

  if (session.isVictoryDay || !session.requiresVictoryDay) return null;
  if (participant?.victoryDate) return null;

  // Victory Day is counted within the participant's own batch (a make-up attendee from an
  // earlier batch keeps their batch's requirement).
  const victoryDayBatchId = participant?.batchId ?? session.batchId;
  const [[{ totalVictoryDaySessions }], [{ attended }]] = await Promise.all([
    victoryDayBatchId == null
      ? Promise.resolve([{ totalVictoryDaySessions: 0 }])
      : db
          .select({ totalVictoryDaySessions: count() })
          .from(classSessions)
          .where(and(eq(classSessions.isVictoryDay, true), eq(classSessions.batchId, victoryDayBatchId))),
    db
      .select({ attended: count() })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(and(eq(checkIns.participantId, participantId), eq(classSessions.isVictoryDay, true), ne(checkIns.status, "Absent"))),
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
  // assignTableNumber is a pure read (no reservation), so it's safe to run it
  // speculatively alongside the eligibility checks instead of waiting for
  // them first — worst case it's an extra read that goes unused if blocked.
  const [blockReason, tableEnabled, tableNumberIfEnabled] = await Promise.all([
    getVictoryDayBlockReason(participantId, classSessionId),
    isTableAssignmentEnabled(),
    assignTableNumber(classSessionId),
  ]);
  if (blockReason) return { error: blockReason };

  const tableNumber = tableEnabled ? tableNumberIfEnabled : null;
  await db
    .insert(checkIns)
    .values({ participantId, classSessionId, remarks: remarks || null, tableNumber, status: status ?? checkInStatusForDate(new Date()), method: "Search" })
    .onConflictDoNothing();
  syncJourneyStepsAfterResponse();
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
  // Run the block-reason check alongside the row lookup instead of after it —
  // it's a pure read, so it's fine to compute speculatively and discard when
  // the participant turns out to already be checked in.
  const [[row], blockReason] = await Promise.all([
    db
      .select({
        firstName: participants.firstName,
        lastName: participants.lastName,
        registrationFee: participants.registrationFee,
        victoryDate: participants.victoryDate,
        checkInId: checkIns.id,
        tableNumber: checkIns.tableNumber,
      })
      .from(participants)
      .leftJoin(checkIns, and(eq(checkIns.participantId, participants.id), eq(checkIns.classSessionId, classSessionId)))
      .where(and(eq(participants.id, participantId), isNull(participants.deletedAt)))
      .limit(1),
    getVictoryDayBlockReason(participantId, classSessionId),
  ]);

  if (!row) return { error: "Participant not found" };

  const alreadyCheckedIn = row.checkInId != null;
  return {
    firstName: toTitleCase(row.firstName),
    lastName: toTitleCase(row.lastName),
    alreadyCheckedIn,
    registrationFee: row.registrationFee,
    tableNumber: row.tableNumber,
    victoryDayBlockReason: alreadyCheckedIn ? null : blockReason,
  };
}

export async function checkInByQr(
  participantId: number,
  classSessionId: number,
  remarks?: string,
  status?: CheckInStatus,
  method: CheckInMethod = "QR Reader",
  skipRevalidate = false,
): Promise<
  | { firstName: string; lastName: string; alreadyCheckedIn: boolean; tableNumber: number | null }
  | { error: string }
> {
  // Every branch below except the final row lookup is a pure read with no
  // dependency on the others, so run them all speculatively up front instead
  // of chaining sequential round trips — the common case (a fresh, unblocked
  // check-in) uses all four results; the "already checked in" / blocked cases
  // just discard the extras.
  const [[row], tableEnabled, blockReason, tableNumberIfEnabled] = await Promise.all([
    db
      .select({
        firstName: participants.firstName,
        lastName: participants.lastName,
        checkInId: checkIns.id,
        tableNumber: checkIns.tableNumber,
      })
      .from(participants)
      .leftJoin(checkIns, and(eq(checkIns.participantId, participants.id), eq(checkIns.classSessionId, classSessionId)))
      .where(and(eq(participants.id, participantId), isNull(participants.deletedAt)))
      .limit(1),
    isTableAssignmentEnabled(),
    getVictoryDayBlockReason(participantId, classSessionId),
    assignTableNumber(classSessionId),
  ]);

  if (!row) return { error: "Participant not found" };

  const firstName = toTitleCase(row.firstName);
  const lastName = toTitleCase(row.lastName);

  if (row.checkInId != null) {
    return { firstName, lastName, alreadyCheckedIn: true, tableNumber: row.tableNumber };
  }

  if (blockReason) return { error: blockReason };

  const tableNumber = tableEnabled ? tableNumberIfEnabled : null;
  await db.insert(checkIns).values({ participantId, classSessionId, remarks: remarks || null, tableNumber, status: status ?? checkInStatusForDate(new Date()), method }).onConflictDoNothing();
  if (!skipRevalidate) {
    syncJourneyStepsAfterResponse();
    revalidatePath("/admin");
    revalidatePath("/sessions");
  }

  return { firstName, lastName, alreadyCheckedIn: false, tableNumber };
}

// Replaying a batch of queued offline check-ins calls checkInByQr with
// skipRevalidate so each one doesn't push a live full-page refresh to
// whoever's viewing /admin — revalidate once here after the whole batch.
export async function revalidateAfterOfflineSync() {
  syncJourneyStepsAfterResponse();
  revalidatePath("/admin");
  revalidatePath("/sessions");
}

export interface CheckinRosterEntry {
  id: number;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  mobileNumber: string | null;
  lifestage: string | null;
  gender: string;
  preferredNameOnId: string | null;
  isWalkIn: boolean;
  victoryDate: string | null;
  registrationFee: string | null;
  checkInId: number | null;
  checkedInAt: Date | null;
  checkInRemarks: string | null;
  checkInStatus: CheckInStatus | null;
  tableNumber: number | null;
  victoryDayDate: string | null;
  victoryDayCount: number;
  totalVictoryDaySessions: number;
  completedVictoryDay: boolean;
  alreadyCheckedIn: boolean;
  victoryDayBlockReason: string | null;
}

/**
 * Bulk-preloads everyone eligible to check in to a session, with their
 * current check-in state and victory-day eligibility already computed, so
 * the QR scanner and the manual name search can both resolve from this one
 * client-side cache instead of round-tripping to the server per scan/keystroke.
 */
export async function getCheckinRoster(
  sessionId: number,
  isVictoryDay: boolean,
  requiresVictoryDay: boolean,
  allowAllClasses = false,
  isOrientation = false
): Promise<CheckinRosterEntry[]> {
  const session = await getSessionBatchScope(sessionId);
  const rows = await db
    .select({
      id: participants.id,
      batchId: participants.batchId,
      firstName: participants.firstName,
      lastName: participants.lastName,
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
      checkInStatus: checkIns.status,
      tableNumber: checkIns.tableNumber,
    })
    .from(participants)
    .leftJoin(checkIns, and(eq(checkIns.participantId, participants.id), eq(checkIns.classSessionId, sessionId)))
    .where(
      and(
        isNull(participants.deletedAt),
        session ? eligibleForSession(session) : undefined,
        isVictoryDay && !allowAllClasses ? notInArray(participants.registrationFee, ["C", "D"]) : undefined,
        isOrientation ? inArray(participants.registrationFee, ORIENTATION_ALLOWED_CLASSES) : undefined
      )
    );

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const [victoryDayTotals, victoryCheckIns] = await Promise.all([
    getVictoryDayTotalsByBatch(),
    db
      .select({ participantId: checkIns.participantId, sessionDate: classSessions.sessionDate })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(and(inArray(checkIns.participantId, ids), eq(classSessions.isVictoryDay, true), ne(checkIns.status, "Absent"))),
  ]);

  const victoryDayDateMap: Record<number, string> = {};
  const victoryAttendanceCount: Record<number, number> = {};
  for (const v of victoryCheckIns) {
    victoryDayDateMap[v.participantId] ??= v.sessionDate;
    victoryAttendanceCount[v.participantId] = (victoryAttendanceCount[v.participantId] ?? 0) + 1;
  }

  const needsVictoryCheck = !isVictoryDay && requiresVictoryDay;

  return rows.map((r) => {
    const alreadyCheckedIn = r.checkInId != null;
    const totalVictoryDaySessions = victoryDayTotalFor(victoryDayTotals, r.batchId ?? session?.batchId ?? null);
    const attended = victoryAttendanceCount[r.id] ?? 0;
    const completedVictoryDay = attended >= totalVictoryDaySessions;

    let victoryDayBlockReason: string | null = null;
    if (!alreadyCheckedIn && needsVictoryCheck && !r.victoryDate) {
      if (totalVictoryDaySessions > 0 && completedVictoryDay) {
        victoryDayBlockReason = null;
      } else if (attended > 0) {
        victoryDayBlockReason = `Victory Day incomplete (${attended}/${totalVictoryDaySessions})`;
      } else {
        victoryDayBlockReason = "No Victory Day yet";
      }
    }

    return {
      id: r.id,
      firstName: toTitleCase(r.firstName),
      lastName: toTitleCase(r.lastName),
      middleInitial: r.middleInitial ? toTitleCase(r.middleInitial) : null,
      mobileNumber: r.mobileNumber,
      lifestage: r.lifestage,
      gender: r.gender,
      preferredNameOnId: r.preferredNameOnId,
      isWalkIn: r.isWalkIn,
      victoryDate: r.victoryDate,
      registrationFee: r.registrationFee,
      checkInId: r.checkInId,
      checkedInAt: r.checkedInAt,
      checkInRemarks: r.checkInRemarks,
      checkInStatus: r.checkInStatus,
      tableNumber: r.tableNumber,
      victoryDayDate: victoryDayDateMap[r.id] ?? null,
      victoryDayCount: attended,
      totalVictoryDaySessions,
      completedVictoryDay,
      alreadyCheckedIn,
      victoryDayBlockReason,
    };
  });
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
      batchId: participants.batchId,
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

  const [victoryDayTotals, victoryCheckIns] = await Promise.all([
    getVictoryDayTotalsByBatch(),

    db
      .select({ participantId: checkIns.participantId, sessionDate: classSessions.sessionDate })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(and(inArray(checkIns.participantId, participantIds), eq(classSessions.isVictoryDay, true), ne(checkIns.status, "Absent"))),
  ]);

  const victoryDayMap: Record<number, string> = {};
  const victoryAttendanceCount: Record<number, number> = {};
  for (const v of victoryCheckIns) {
    victoryDayMap[v.participantId] ??= v.sessionDate;
    victoryAttendanceCount[v.participantId] = (victoryAttendanceCount[v.participantId] ?? 0) + 1;
  }

  return rows.map(({ batchId, ...r }) => {
    const totalVictoryDaySessions = victoryDayTotalFor(victoryDayTotals, batchId);
    return {
      ...r,
      victoryDayDate: victoryDayMap[r.participantId] ?? null,
      victoryDayCount: victoryAttendanceCount[r.participantId] ?? 0,
      totalVictoryDaySessions,
      completedVictoryDay: (victoryAttendanceCount[r.participantId] ?? 0) >= totalVictoryDaySessions,
    };
  });
}

export async function searchParticipants(sessionId: number, q: string, isVictoryDay = false, allowAllClasses = false, isOrientation = false) {
  if (!q.trim()) return [];
  const session = await getSessionBatchScope(sessionId);
  const rows = await db
    .select({
      id: participants.id,
      batchId: participants.batchId,
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
        session ? eligibleForSession(session) : undefined,
        isVictoryDay && !allowAllClasses ? notInArray(participants.registrationFee, ["C", "D"]) : undefined,
        isOrientation ? inArray(participants.registrationFee, ORIENTATION_ALLOWED_CLASSES) : undefined
      )
    )
    .orderBy(participants.lastName)
    .limit(30);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const [victoryDayTotals, victoryCheckIns] = await Promise.all([
    getVictoryDayTotalsByBatch(),

    db
      .select({ participantId: checkIns.participantId, sessionDate: classSessions.sessionDate })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(and(inArray(checkIns.participantId, ids), eq(classSessions.isVictoryDay, true), ne(checkIns.status, "Absent"))),
  ]);

  const victoryCountMap: Record<number, string> = {};
  const victoryAttendanceCount: Record<number, number> = {};
  for (const v of victoryCheckIns) {
    victoryCountMap[v.participantId] ??= v.sessionDate;
    victoryAttendanceCount[v.participantId] = (victoryAttendanceCount[v.participantId] ?? 0) + 1;
  }

  return rows.map(({ batchId, ...r }) => {
    const totalVictoryDaySessions = victoryDayTotalFor(victoryDayTotals, batchId ?? session?.batchId ?? null);
    return {
      ...r,
      victoryDayDate: victoryCountMap[r.id] ?? null,
      victoryDayCount: victoryAttendanceCount[r.id] ?? 0,
      totalVictoryDaySessions,
      completedVictoryDay: (victoryAttendanceCount[r.id] ?? 0) >= totalVictoryDaySessions,
      checkInRemarks: r.checkInRemarks ?? null,
    };
  });
}

export async function addWalkIn(classSessionId: number, formData: FormData) {
  const mobileNumber = (formData.get("mobileNumber") as string) || "";
  if (mobileNumber && !MOBILE_NUMBER_REGEX.test(mobileNumber)) {
    throw new Error("Invalid mobile number format.");
  }

  const [targetSession] = await db
    .select({ vglOnly: classSessions.vglOnly, batchId: classSessions.batchId })
    .from(classSessions)
    .where(eq(classSessions.id, classSessionId))
    .limit(1);
  if (targetSession?.vglOnly) throw new Error(VGL_ONLY_BLOCK_REASON);

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
      mobileNumber: mobileNumber || null,
      lifestage: ((formData.get("lifestage") as string) || null) as Lifestage | null,
      age: Number(formData.get("age")),
      gender: formData.get("gender") as string,
      serviceAttending: formData.get("serviceAttending") as string,
      facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
      vgLeaderId: vgLeaderRecord?.id ?? null,
      victoryDate: formData.get("victoryDate") as string,
      isWalkIn: true,
      batchId: targetSession?.batchId ?? null,
    })
    .returning({ id: participants.id });

  const remarks = (formData.get("remarks") as string) || null;
  const tableNumber = (await isTableAssignmentEnabled()) ? await assignTableNumber(classSessionId) : null;
  await db.insert(checkIns).values({ participantId: inserted.id, classSessionId, remarks, tableNumber, status: checkInStatusForDate(new Date()), method: "Walk-in" }).onConflictDoNothing();

  revalidatePath("/admin");
  revalidatePath("/participants");
  revalidatePath("/sessions");

  return { tableNumber };
}

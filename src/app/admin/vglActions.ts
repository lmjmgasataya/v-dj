"use server";

import { db } from "@/db";
import { classSessions, sessionVglCheckIns, victoryGroupLeaders, type CheckInStatus } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getActiveVgLeaderIds } from "@/lib/vgSnapshotCompute";
import { revalidatePath } from "next/cache";
import { syncJourneyStepsAfterResponse } from "@/lib/djPortalJourney";
import { getSession } from "@/lib/auth";
import { checkInStatusForDate } from "@/lib/date";
import { toTitleCase } from "@/lib/text";

// Server Actions are reachable regardless of which page imports them, so gate each one.
async function canCheckIn() {
  const session = await getSession();
  return !!session && session.role !== "vg_leader";
}

async function isVglOnlySession(classSessionId: number) {
  const [row] = await db
    .select({ vglOnly: classSessions.vglOnly })
    .from(classSessions)
    .where(eq(classSessions.id, classSessionId))
    .limit(1);
  return row?.vglOnly ?? false;
}

export interface VglRosterEntry {
  id: number;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  nickname: string | null;
  mobileNumber: string | null;
  serviceAttending: string | null;
  /** Has a portal account (claimed — a PIN reset still counts) and a completed profile. */
  claimedAndCompleted: boolean;
  checkInId: number | null;
  checkedInAt: Date | null;
  checkInStatus: CheckInStatus | null;
  checkInRemarks: string | null;
}

/**
 * Everyone eligible for a VGL-only session: the Snapshot Report's VG Leaders (see
 * getActiveVgLeaderIds) — plus anyone already checked in, so a leader who drops out of
 * that list afterwards doesn't vanish from the attendance.
 */
export async function getVglCheckinRoster(classSessionId: number): Promise<VglRosterEntry[]> {
  if (!(await canCheckIn())) return [];

  const [eligibleIds, rows] = await Promise.all([
    getActiveVgLeaderIds(),
    db
      .select({
        id: victoryGroupLeaders.id,
        firstName: victoryGroupLeaders.firstName,
        lastName: victoryGroupLeaders.lastName,
        middleInitial: victoryGroupLeaders.middleInitial,
        nickname: victoryGroupLeaders.nickname,
        mobileNumber: victoryGroupLeaders.mobileNumber,
        serviceAttending: victoryGroupLeaders.serviceAttending,
        checkInId: sessionVglCheckIns.id,
        checkedInAt: sessionVglCheckIns.checkedInAt,
        checkInStatus: sessionVglCheckIns.status,
        checkInRemarks: sessionVglCheckIns.remarks,
      })
      .from(victoryGroupLeaders)
      .leftJoin(
        sessionVglCheckIns,
        and(eq(sessionVglCheckIns.vgLeaderId, victoryGroupLeaders.id), eq(sessionVglCheckIns.classSessionId, classSessionId))
      )
      .orderBy(victoryGroupLeaders.lastName, victoryGroupLeaders.firstName),
  ]);

  return rows
    .filter((r) => eligibleIds.has(r.id) || r.checkInId != null)
    .map((r) => ({
      ...r,
      claimedAndCompleted: eligibleIds.has(r.id),
      firstName: toTitleCase(r.firstName),
      lastName: toTitleCase(r.lastName),
      middleInitial: r.middleInitial ? toTitleCase(r.middleInitial) : null,
    }));
}

export async function checkInVgl(
  vgLeaderId: number,
  classSessionId: number,
  remarks?: string,
  status?: CheckInStatus
): Promise<{ error: string } | { success: true; firstName: string; lastName: string; status: CheckInStatus }> {
  if (!(await canCheckIn())) return { error: "Not authorized" };

  const [vglOnly, [leader]] = await Promise.all([
    isVglOnlySession(classSessionId),
    db
      .select({
        firstName: victoryGroupLeaders.firstName,
        lastName: victoryGroupLeaders.lastName,
        isActive: victoryGroupLeaders.isActive,
        deletedAt: victoryGroupLeaders.deletedAt,
      })
      .from(victoryGroupLeaders)
      .where(eq(victoryGroupLeaders.id, vgLeaderId))
      .limit(1),
  ]);

  if (!vglOnly) return { error: "This session is not a VG leaders only session" };
  if (!leader || leader.deletedAt) return { error: "VG leader not found" };
  if (!leader.isActive || !(await getActiveVgLeaderIds()).has(vgLeaderId)) {
    return { error: "Only active VG leaders with a completed profile can check in to this session" };
  }

  const finalStatus = status ?? checkInStatusForDate(new Date());
  await db
    .insert(sessionVglCheckIns)
    .values({ vgLeaderId, classSessionId, remarks: remarks || null, status: finalStatus, method: "Search" })
    .onConflictDoNothing();
  syncJourneyStepsAfterResponse();

  revalidatePath("/admin");
  revalidatePath("/sessions");
  return { success: true, firstName: toTitleCase(leader.firstName), lastName: toTitleCase(leader.lastName), status: finalStatus };
}

export async function removeVglCheckIn(vgLeaderId: number, classSessionId: number) {
  if (!(await canCheckIn())) return;
  await db
    .delete(sessionVglCheckIns)
    .where(and(eq(sessionVglCheckIns.vgLeaderId, vgLeaderId), eq(sessionVglCheckIns.classSessionId, classSessionId)));
  revalidatePath("/admin");
  revalidatePath("/sessions");
}

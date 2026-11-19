"use server";

import { db } from "@/db";
import { checkInStatusEnum, l113BatchStudents, l113CheckIns, l113ScheduleDates, l113Schedules, victoryGroupLeaders } from "@/db/schema";
import type { CheckInMethod, CheckInStatus } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireL113Admin } from "@/lib/l113Data";
import { l113CheckInStatus } from "@/lib/l113";
import { todayPH } from "@/lib/date";

export type L113CheckInMethod = Extract<CheckInMethod, "Search" | "Webcam" | "QR Reader">;
const L113_METHODS: CheckInMethod[] = ["Search", "Webcam", "QR Reader"];

export type L113CheckInResult =
  | { ok: true; firstName: string; lastName: string; status: CheckInStatus; alreadyCheckedIn: boolean }
  | { ok: false; error: string };

/**
 * The class date with its batch, and the student's name if they're a student of that batch
 * (one row per batch they're in — a leader can be in more than one).
 */
async function lookup(scheduleDateId: number, vgLeaderId: number) {
  const [[date], rows] = await Promise.all([
    db
      .select({ classDate: l113ScheduleDates.classDate, batchId: l113Schedules.batchId, isBreak: l113Schedules.isBreak })
      .from(l113ScheduleDates)
      .innerJoin(l113Schedules, eq(l113Schedules.id, l113ScheduleDates.scheduleId))
      .where(eq(l113ScheduleDates.id, scheduleDateId))
      .limit(1),
    db
      .select({ batchId: l113BatchStudents.batchId, firstName: victoryGroupLeaders.firstName, lastName: victoryGroupLeaders.lastName })
      .from(victoryGroupLeaders)
      .leftJoin(l113BatchStudents, eq(l113BatchStudents.vgLeaderId, victoryGroupLeaders.id))
      .where(eq(victoryGroupLeaders.id, vgLeaderId)),
  ]);
  const person = rows.length ? { firstName: rows[0].firstName, lastName: rows[0].lastName } : null;
  const name = person ? `${person.firstName} ${person.lastName}` : null;
  return { date, person, name, inBatch: !!date && rows.some((r) => r.batchId === date.batchId) };
}

/**
 * Checks a student in. On the class date the status defaults to the time rule (On Time
 * ≤ 9:00 AM, Late ≤ 9:10 AM, Absent after) and a second scan keeps the first check-in. For a
 * past class date (manual search only) the admin picks the status.
 */
export async function checkInL113Student(
  scheduleDateId: number,
  vgLeaderId: number,
  method: L113CheckInMethod,
  statusOverride?: CheckInStatus
): Promise<L113CheckInResult> {
  await requireL113Admin();
  if (!L113_METHODS.includes(method)) return { ok: false, error: "Unknown check-in method." };
  if (statusOverride && !checkInStatusEnum.enumValues.includes(statusOverride)) return { ok: false, error: "Unknown status." };
  const { date, person, name, inBatch } = await lookup(scheduleDateId, vgLeaderId);
  if (!date || date.isBreak) return { ok: false, error: "That class date no longer exists." };
  if (!person) return { ok: false, error: "QR code not recognized." };
  if (!inBatch) return { ok: false, error: `${name} isn't a student of this batch.` };

  const today = todayPH();
  if (date.classDate > today) return { ok: false, error: "Check-in opens on the class date." };
  const now = new Date();

  if (date.classDate < today) {
    if (method !== "Search" || !statusOverride) return { ok: false, error: "QR check-in is only open on the class date itself." };
    await db
      .insert(l113CheckIns)
      .values({ scheduleDateId, vgLeaderId, checkedInAt: now, status: statusOverride, method })
      .onConflictDoUpdate({ target: [l113CheckIns.scheduleDateId, l113CheckIns.vgLeaderId], set: { status: statusOverride } });
    revalidatePath("/l113-portal/check-in");
    return { ok: true, ...person, status: statusOverride, alreadyCheckedIn: false };
  }

  const status = statusOverride ?? l113CheckInStatus(now);
  const inserted = await db
    .insert(l113CheckIns)
    .values({ scheduleDateId, vgLeaderId, checkedInAt: now, status, method })
    .onConflictDoNothing()
    .returning({ status: l113CheckIns.status });

  revalidatePath("/l113-portal/check-in");
  if (inserted.length) return { ok: true, ...person, status, alreadyCheckedIn: false };

  const [existing] = await db
    .select({ status: l113CheckIns.status })
    .from(l113CheckIns)
    .where(and(eq(l113CheckIns.scheduleDateId, scheduleDateId), eq(l113CheckIns.vgLeaderId, vgLeaderId)))
    .limit(1);
  return { ok: true, ...person, status: existing?.status ?? status, alreadyCheckedIn: true };
}

/** Undo: removes a student's check-in for a class date that has started. */
export async function removeL113CheckIn(scheduleDateId: number, vgLeaderId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireL113Admin();
  const { date } = await lookup(scheduleDateId, vgLeaderId);
  if (!date) return { ok: false, error: "That class date no longer exists." };
  await db.delete(l113CheckIns).where(and(eq(l113CheckIns.scheduleDateId, scheduleDateId), eq(l113CheckIns.vgLeaderId, vgLeaderId)));
  revalidatePath("/l113-portal/check-in");
  return { ok: true };
}

"use server";

import { db } from "@/db";
import {
  victoryGroupLeaders,
  interns,
  eventCheckIns,
  eventRegistrations,
  internEventRegistrations,
  type eventAudienceEnum,
} from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Audience = (typeof eventAudienceEnum.enumValues)[number];

export interface EventSearchResult {
  key: string;
  attendeeType: Audience;
  vgLeaderId: number | null;
  internId: number | null;
  attendeeName: string;
  mobileNumber: string | null;
  checkInId: number | null;
  checkedInAt: Date | null;
}

export interface EventCheckInRow {
  id: number;
  attendeeType: Audience;
  attendeeName: string;
  checkedInAt: Date;
}

async function listRegisteredVgLeaders(eventId: number): Promise<EventSearchResult[]> {
  const rows = await db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      mobileNumber: victoryGroupLeaders.mobileNumber,
      checkInId: eventCheckIns.id,
      checkedInAt: eventCheckIns.checkedInAt,
    })
    .from(eventRegistrations)
    .innerJoin(victoryGroupLeaders, eq(eventRegistrations.vgLeaderId, victoryGroupLeaders.id))
    .leftJoin(
      eventCheckIns,
      and(eq(eventCheckIns.vgLeaderId, victoryGroupLeaders.id), eq(eventCheckIns.eventId, eventId))
    )
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.willAttend, true),
        isNull(victoryGroupLeaders.deletedAt)
      )
    )
    .orderBy(victoryGroupLeaders.lastName);

  return rows.map((r) => ({
    key: `vgl:${r.id}`,
    attendeeType: "vg_leader" as const,
    vgLeaderId: r.id,
    internId: null,
    attendeeName: `${r.lastName}, ${r.firstName}`,
    mobileNumber: r.mobileNumber,
    checkInId: r.checkInId,
    checkedInAt: r.checkedInAt,
  }));
}

async function listRegisteredInterns(eventId: number): Promise<EventSearchResult[]> {
  const rows = await db
    .select({
      id: interns.id,
      lastName: interns.lastName,
      firstName: interns.firstName,
      checkInId: eventCheckIns.id,
      checkedInAt: eventCheckIns.checkedInAt,
    })
    .from(internEventRegistrations)
    .innerJoin(interns, eq(internEventRegistrations.internId, interns.id))
    .leftJoin(eventCheckIns, and(eq(eventCheckIns.internId, interns.id), eq(eventCheckIns.eventId, eventId)))
    .where(and(eq(internEventRegistrations.eventId, eventId), eq(internEventRegistrations.willAttend, true)))
    .orderBy(interns.lastName);

  return rows.map((r) => ({
    key: `intern:${r.id}`,
    attendeeType: "intern" as const,
    vgLeaderId: null,
    internId: r.id,
    attendeeName: `${r.lastName}, ${r.firstName}`,
    mobileNumber: null,
    checkInId: r.checkInId,
    checkedInAt: r.checkedInAt,
  }));
}

export async function listEventRegisteredAttendees(eventId: number, audience: Audience[]): Promise<EventSearchResult[]> {
  const [vgl, internResults] = await Promise.all([
    audience.includes("vg_leader") ? listRegisteredVgLeaders(eventId) : Promise.resolve([]),
    audience.includes("intern") ? listRegisteredInterns(eventId) : Promise.resolve([]),
  ]);

  return [...vgl, ...internResults].sort((a, b) => a.attendeeName.localeCompare(b.attendeeName));
}

export async function checkInEventVgLeader(eventId: number, vgLeaderId: number): Promise<{ error: string | null; checkInId: number | null }> {
  const [leader] = await db
    .select({ lastName: victoryGroupLeaders.lastName, firstName: victoryGroupLeaders.firstName })
    .from(victoryGroupLeaders)
    .where(eq(victoryGroupLeaders.id, vgLeaderId))
    .limit(1);
  if (!leader) return { error: "Leader not found.", checkInId: null };

  await db
    .insert(eventCheckIns)
    .values({
      eventId,
      attendeeType: "vg_leader",
      vgLeaderId,
      attendeeName: `${leader.lastName}, ${leader.firstName}`,
    })
    .onConflictDoNothing();

  const [row] = await db
    .select({ id: eventCheckIns.id })
    .from(eventCheckIns)
    .where(and(eq(eventCheckIns.eventId, eventId), eq(eventCheckIns.vgLeaderId, vgLeaderId)))
    .limit(1);

  revalidatePath("/event-registration/check-in");
  return { error: null, checkInId: row?.id ?? null };
}

export async function checkInEventIntern(eventId: number, internId: number): Promise<{ error: string | null; checkInId: number | null }> {
  const [intern] = await db
    .select({ lastName: interns.lastName, firstName: interns.firstName })
    .from(interns)
    .where(eq(interns.id, internId))
    .limit(1);
  if (!intern) return { error: "Intern not found.", checkInId: null };

  await db
    .insert(eventCheckIns)
    .values({
      eventId,
      attendeeType: "intern",
      internId,
      attendeeName: `${intern.lastName}, ${intern.firstName}`,
    })
    .onConflictDoNothing();

  const [row] = await db
    .select({ id: eventCheckIns.id })
    .from(eventCheckIns)
    .where(and(eq(eventCheckIns.eventId, eventId), eq(eventCheckIns.internId, internId)))
    .limit(1);

  revalidatePath("/event-registration/check-in");
  return { error: null, checkInId: row?.id ?? null };
}

export async function undoEventCheckIn(checkInId: number) {
  await db.delete(eventCheckIns).where(eq(eventCheckIns.id, checkInId));
  revalidatePath("/event-registration/check-in");
}

export async function listEventCheckIns(eventId: number): Promise<EventCheckInRow[]> {
  const rows = await db
    .select({
      id: eventCheckIns.id,
      attendeeType: eventCheckIns.attendeeType,
      attendeeName: eventCheckIns.attendeeName,
      checkedInAt: eventCheckIns.checkedInAt,
    })
    .from(eventCheckIns)
    .where(eq(eventCheckIns.eventId, eventId))
    .orderBy(sql`${eventCheckIns.checkedInAt} desc`);
  return rows;
}

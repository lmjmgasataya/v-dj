"use server";

import { db } from "@/db";
import {
  events,
  victoryGroupLeaders,
  interns,
  victoryGroups,
  eventCheckIns,
  eventRegistrations,
  internEventRegistrations,
  type eventAudienceEnum,
} from "@/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasLeaderAudience, isEventOpenToLeader } from "@/lib/eventAudience";
import { getLiveUpdateStatus, getLiveUpdateStatuses } from "@/lib/vgLeaderProfile";

type Audience = (typeof eventAudienceEnum.enumValues)[number];

export interface EventSearchResult {
  key: string;
  attendeeType: Audience;
  vgLeaderId: number | null;
  internId: number | null;
  attendeeName: string;
  mobileNumber: string | null;
  /** The leader's service; for an intern, their VG leader's. */
  service: string | null;
  checkInId: number | null;
  checkedInAt: Date | null;
  internRemovedFromGroup: boolean;
  /** Checked in at the door without registering beforehand (VG leaders only). */
  isWalkIn: boolean;
}

/** A VG leader who didn't register, offered for walk-in check-in. */
export interface WalkInCandidate {
  vgLeaderId: number;
  attendeeName: string;
  service: string | null;
  /** Saved this update period and 100% complete — required to check in as a walk-in. */
  profileUpdated: boolean;
}

export interface EventCheckInRow {
  id: number;
  attendeeType: Audience;
  attendeeName: string;
  checkedInAt: Date;
}

async function listRegisteredVgLeaders(eventId: number, serviceRawValues?: string[]): Promise<EventSearchResult[]> {
  const rows = await db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      mobileNumber: victoryGroupLeaders.mobileNumber,
      service: victoryGroupLeaders.serviceAttending,
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
        isNull(victoryGroupLeaders.deletedAt),
        serviceRawValues ? inArray(victoryGroupLeaders.serviceAttending, serviceRawValues) : undefined
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
    service: r.service,
    checkInId: r.checkInId,
    checkedInAt: r.checkedInAt,
    internRemovedFromGroup: false,
    isWalkIn: false,
  }));
}

/** VG leaders checked in to the event without a "will attend" registration. */
async function listWalkInVgLeaders(eventId: number, serviceRawValues?: string[]): Promise<EventSearchResult[]> {
  const rows = await db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      mobileNumber: victoryGroupLeaders.mobileNumber,
      service: victoryGroupLeaders.serviceAttending,
      checkInId: eventCheckIns.id,
      checkedInAt: eventCheckIns.checkedInAt,
    })
    .from(eventCheckIns)
    .innerJoin(victoryGroupLeaders, eq(eventCheckIns.vgLeaderId, victoryGroupLeaders.id))
    .leftJoin(
      eventRegistrations,
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.vgLeaderId, victoryGroupLeaders.id),
        eq(eventRegistrations.willAttend, true)
      )
    )
    .where(
      and(
        eq(eventCheckIns.eventId, eventId),
        isNull(eventRegistrations.id),
        isNull(victoryGroupLeaders.deletedAt),
        serviceRawValues ? inArray(victoryGroupLeaders.serviceAttending, serviceRawValues) : undefined
      )
    );

  return rows.map((r) => ({
    key: `vgl:${r.id}`,
    attendeeType: "vg_leader" as const,
    vgLeaderId: r.id,
    internId: null,
    attendeeName: `${r.lastName}, ${r.firstName}`,
    mobileNumber: r.mobileNumber,
    service: r.service,
    checkInId: r.checkInId,
    checkedInAt: r.checkedInAt,
    internRemovedFromGroup: false,
    isWalkIn: true,
  }));
}

async function listRegisteredInterns(eventId: number, serviceRawValues?: string[]): Promise<EventSearchResult[]> {
  const rows = await db
    .select({
      id: interns.id,
      lastName: interns.lastName,
      firstName: interns.firstName,
      deletedAt: interns.deletedAt,
      service: victoryGroupLeaders.serviceAttending,
      checkInId: eventCheckIns.id,
      checkedInAt: eventCheckIns.checkedInAt,
    })
    .from(internEventRegistrations)
    .innerJoin(interns, eq(internEventRegistrations.internId, interns.id))
    .leftJoin(eventCheckIns, and(eq(eventCheckIns.internId, interns.id), eq(eventCheckIns.eventId, eventId)))
    .innerJoin(victoryGroups, eq(interns.victoryGroupId, victoryGroups.id))
    .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
    .where(
      and(
        eq(internEventRegistrations.eventId, eventId),
        eq(internEventRegistrations.willAttend, true),
        serviceRawValues ? inArray(victoryGroupLeaders.serviceAttending, serviceRawValues) : undefined
      )
    )
    .orderBy(interns.lastName);

  return rows.map((r) => ({
    key: `intern:${r.id}`,
    attendeeType: "intern" as const,
    vgLeaderId: null,
    internId: r.id,
    attendeeName: `${r.lastName}, ${r.firstName}`,
    mobileNumber: null,
    service: r.service,
    checkInId: r.checkInId,
    checkedInAt: r.checkedInAt,
    internRemovedFromGroup: r.deletedAt != null,
    isWalkIn: false,
  }));
}

export async function listEventRegisteredAttendees(
  eventId: number,
  audience: Audience[],
  serviceRawValues?: string[]
): Promise<EventSearchResult[]> {
  const leaders = hasLeaderAudience(audience);
  const [vgl, walkIns, internResults] = await Promise.all([
    leaders ? listRegisteredVgLeaders(eventId, serviceRawValues) : Promise.resolve([]),
    leaders ? listWalkInVgLeaders(eventId, serviceRawValues) : Promise.resolve([]),
    audience.includes("intern") ? listRegisteredInterns(eventId, serviceRawValues) : Promise.resolve([]),
  ]);

  return [...vgl, ...walkIns, ...internResults].sort((a, b) => a.attendeeName.localeCompare(b.attendeeName));
}

async function canCheckIn(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "developer" || session?.role === "admin_volunteer";
}

async function getOpenEvent(eventId: number) {
  const [event] = await db
    .select({ audience: events.audience, isDone: events.isDone })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  return event && !event.isDone && hasLeaderAudience(event.audience) ? event : null;
}

/**
 * VG leaders who haven't registered to attend (or declined) and aren't checked in yet, for
 * walk-in check-in — only the ones the event is open to (an LGL-only event offers only LGLs).
 */
export async function listEventWalkInCandidates(eventId: number): Promise<WalkInCandidate[]> {
  if (!(await canCheckIn())) return [];
  const event = await getOpenEvent(eventId);
  if (!event) return [];

  const rows = await db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      service: victoryGroupLeaders.serviceAttending,
      isLeadershipGroupLeader: victoryGroupLeaders.isLeadershipGroupLeader,
    })
    .from(victoryGroupLeaders)
    .leftJoin(
      eventRegistrations,
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.vgLeaderId, victoryGroupLeaders.id),
        eq(eventRegistrations.willAttend, true)
      )
    )
    .leftJoin(eventCheckIns, and(eq(eventCheckIns.eventId, eventId), eq(eventCheckIns.vgLeaderId, victoryGroupLeaders.id)))
    .where(and(isNull(victoryGroupLeaders.deletedAt), isNull(eventRegistrations.id), isNull(eventCheckIns.id)))
    .orderBy(victoryGroupLeaders.lastName, victoryGroupLeaders.firstName);

  const open = rows.filter((r) => isEventOpenToLeader(event.audience, r.isLeadershipGroupLeader));
  const statuses = await getLiveUpdateStatuses(open.map((r) => r.id));
  return open.map((r) => ({
    vgLeaderId: r.id,
    attendeeName: `${r.lastName}, ${r.firstName}`,
    service: r.service,
    profileUpdated: statuses.get(r.id) === "updated",
  }));
}

/**
 * Checks in a VG leader who didn't register. Like registering through the event link, it needs
 * an up-to-date profile (saved this update period and 100% complete).
 */
export async function checkInEventWalkIn(eventId: number, vgLeaderId: number): Promise<{ error: string | null; checkInId: number | null }> {
  if (!(await canCheckIn())) return { error: "Not allowed.", checkInId: null };
  const event = await getOpenEvent(eventId);
  if (!event) return { error: "This event isn't open for check-in.", checkInId: null };

  const [leader] = await db
    .select({ isLeadershipGroupLeader: victoryGroupLeaders.isLeadershipGroupLeader })
    .from(victoryGroupLeaders)
    .where(and(eq(victoryGroupLeaders.id, vgLeaderId), isNull(victoryGroupLeaders.deletedAt)))
    .limit(1);
  if (!leader) return { error: "Leader not found.", checkInId: null };
  if (!isEventOpenToLeader(event.audience, leader.isLeadershipGroupLeader)) {
    return { error: "This event is for Leadership Group Leaders only.", checkInId: null };
  }
  if ((await getLiveUpdateStatus(vgLeaderId)) !== "updated") {
    return { error: "Their profile isn't updated yet. Ask them to update it in the VGL Portal first.", checkInId: null };
  }

  return checkInEventVgLeader(eventId, vgLeaderId);
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

export async function removeInternEventRegistration(formData: FormData) {
  const eventId = Number(formData.get("eventId"));
  const internId = Number(formData.get("internId"));
  await db
    .delete(internEventRegistrations)
    .where(and(eq(internEventRegistrations.eventId, eventId), eq(internEventRegistrations.internId, internId)));
  revalidatePath(`/event-registration/events/${eventId}`);
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

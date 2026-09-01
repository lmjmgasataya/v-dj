"use server";

import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, eventCheckIns, users, type eventAudienceEnum } from "@/db/schema";
import { and, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Audience = (typeof eventAudienceEnum.enumValues)[number];

export interface EventSearchResult {
  key: string;
  attendeeType: Audience;
  vgLeaderId: number | null;
  attendeeName: string;
  mobileNumber: string | null;
  checkInId: number | null;
}

export interface EventCheckInRow {
  id: number;
  attendeeType: Audience;
  attendeeName: string;
  checkedInAt: Date;
}

async function searchVgLeaders(eventId: number, q: string): Promise<EventSearchResult[]> {
  const rows = await db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      mobileNumber: victoryGroupLeaders.mobileNumber,
      checkInId: eventCheckIns.id,
    })
    .from(victoryGroupLeaders)
    .innerJoin(users, and(eq(users.vgLeaderId, victoryGroupLeaders.id), eq(users.role, "vg_leader")))
    .leftJoin(
      eventCheckIns,
      and(eq(eventCheckIns.vgLeaderId, victoryGroupLeaders.id), eq(eventCheckIns.eventId, eventId))
    )
    .where(
      and(
        isNotNull(users.pinHash),
        isNull(victoryGroupLeaders.deletedAt),
        or(ilike(victoryGroupLeaders.lastName, `%${q}%`), ilike(victoryGroupLeaders.firstName, `%${q}%`))
      )
    )
    .orderBy(victoryGroupLeaders.lastName)
    .limit(20);

  return rows.map((r) => ({
    key: `vgl:${r.id}`,
    attendeeType: "vg_leader" as const,
    vgLeaderId: r.id,
    attendeeName: `${r.lastName}, ${r.firstName}`,
    mobileNumber: r.mobileNumber,
    checkInId: r.checkInId,
  }));
}

async function searchInterns(eventId: number, q: string): Promise<EventSearchResult[]> {
  const rows = await db
    .selectDistinct({ intern: victoryGroups.intern })
    .from(victoryGroups)
    .where(
      and(
        isNull(victoryGroups.deletedAt),
        eq(victoryGroups.isActive, true),
        sql`${victoryGroups.intern} is not null and trim(${victoryGroups.intern}) <> '' and lower(${victoryGroups.intern}) <> 'none'`,
        ilike(victoryGroups.intern, `%${q}%`)
      )
    )
    .limit(20);

  const names = Array.from(new Set(rows.map((r) => (r.intern as string).trim())));
  if (names.length === 0) return [];

  const checkedInRows = await db
    .select({ id: eventCheckIns.id, attendeeName: eventCheckIns.attendeeName })
    .from(eventCheckIns)
    .where(and(eq(eventCheckIns.eventId, eventId), eq(eventCheckIns.attendeeType, "intern")));
  const checkedInByName = new Map(checkedInRows.map((r) => [r.attendeeName.toLowerCase(), r.id]));

  return names.map((name) => ({
    key: `intern:${name.toLowerCase()}`,
    attendeeType: "intern" as const,
    vgLeaderId: null,
    attendeeName: name,
    mobileNumber: null,
    checkInId: checkedInByName.get(name.toLowerCase()) ?? null,
  }));
}

export async function searchEventAttendees(eventId: number, audience: Audience[], q: string): Promise<EventSearchResult[]> {
  if (q.trim().length < 2) return [];

  const [vgl, interns] = await Promise.all([
    audience.includes("vg_leader") ? searchVgLeaders(eventId, q) : Promise.resolve([]),
    audience.includes("intern") ? searchInterns(eventId, q) : Promise.resolve([]),
  ]);

  return [...vgl, ...interns].sort((a, b) => a.attendeeName.localeCompare(b.attendeeName));
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

export async function checkInEventIntern(eventId: number, attendeeName: string): Promise<{ error: string | null; checkInId: number | null }> {
  const name = attendeeName.trim();
  if (!name) return { error: "Name is required.", checkInId: null };

  const [existing] = await db
    .select({ id: eventCheckIns.id })
    .from(eventCheckIns)
    .where(
      and(
        eq(eventCheckIns.eventId, eventId),
        eq(eventCheckIns.attendeeType, "intern"),
        ilike(eventCheckIns.attendeeName, name)
      )
    )
    .limit(1);
  if (existing) return { error: `${name} is already checked in.`, checkInId: null };

  // Best-effort match to an existing leader record, purely for a nicer display/mobile lookup later.
  const nameParts = name.split(",").map((p) => p.trim());
  let vgLeaderId: number | null = null;
  if (nameParts.length === 2) {
    const [lastName, firstName] = nameParts;
    const [match] = await db
      .select({ id: victoryGroupLeaders.id })
      .from(victoryGroupLeaders)
      .where(
        and(
          ilike(victoryGroupLeaders.lastName, lastName),
          ilike(victoryGroupLeaders.firstName, firstName),
          isNull(victoryGroupLeaders.deletedAt)
        )
      )
      .limit(1);
    vgLeaderId = match?.id ?? null;
  }

  const [created] = await db
    .insert(eventCheckIns)
    .values({ eventId, attendeeType: "intern", vgLeaderId, attendeeName: name })
    .returning({ id: eventCheckIns.id });

  revalidatePath("/event-registration/check-in");
  return { error: null, checkInId: created.id };
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

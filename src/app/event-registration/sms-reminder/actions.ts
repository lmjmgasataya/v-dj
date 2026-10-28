"use server";

import { db } from "@/db";
import { victoryGroupLeaders, interns, eventRegistrations, internEventRegistrations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { hasLeaderAudience, type EventAudience } from "@/lib/eventAudience";

export interface EventAudiencePerson {
  id: number;
  name: string;
  mobileNumber: string | null;
}

export async function getEventAudience(
  eventId: number,
  audience: EventAudience[]
): Promise<{ vgLeaders: EventAudiencePerson[]; interns: EventAudiencePerson[] }> {
  let vgLeaders: EventAudiencePerson[] = [];
  if (hasLeaderAudience(audience)) {
    const rows = await db
      .select({
        id: victoryGroupLeaders.id,
        lastName: victoryGroupLeaders.lastName,
        firstName: victoryGroupLeaders.firstName,
        mobileNumber: victoryGroupLeaders.mobileNumber,
      })
      .from(eventRegistrations)
      .innerJoin(victoryGroupLeaders, eq(eventRegistrations.vgLeaderId, victoryGroupLeaders.id))
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.willAttend, true)))
      .orderBy(victoryGroupLeaders.lastName);

    vgLeaders = rows.map((r) => ({ id: r.id, name: `${r.lastName}, ${r.firstName}`, mobileNumber: r.mobileNumber }));
  }

  let internPeople: EventAudiencePerson[] = [];
  if (audience.includes("intern")) {
    const rows = await db
      .select({ id: interns.id, lastName: interns.lastName, firstName: interns.firstName })
      .from(internEventRegistrations)
      .innerJoin(interns, eq(internEventRegistrations.internId, interns.id))
      .where(and(eq(internEventRegistrations.eventId, eventId), eq(internEventRegistrations.willAttend, true)))
      .orderBy(interns.lastName);

    internPeople = rows.map((r) => ({ id: r.id, name: `${r.lastName}, ${r.firstName}`, mobileNumber: null }));
  }

  return { vgLeaders, interns: internPeople };
}

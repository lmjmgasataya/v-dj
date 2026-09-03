"use server";

import { db } from "@/db";
import { events, internEventRegistrations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isRegistrationClosed } from "@/lib/date";

export async function getInternEventRegistration(eventId: number, internId: number): Promise<boolean | null> {
  const [reg] = await db
    .select({ willAttend: internEventRegistrations.willAttend })
    .from(internEventRegistrations)
    .where(and(eq(internEventRegistrations.eventId, eventId), eq(internEventRegistrations.internId, internId)))
    .limit(1);
  return reg?.willAttend ?? null;
}

export async function registerInternForEvent(eventId: number, internId: number, willAttend: boolean) {
  const [event] = await db
    .select({ registrationDeadline: events.registrationDeadline })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (isRegistrationClosed(event?.registrationDeadline ?? null)) return;

  await db
    .insert(internEventRegistrations)
    .values({ eventId, internId, willAttend })
    .onConflictDoUpdate({
      target: [internEventRegistrations.eventId, internEventRegistrations.internId],
      set: { willAttend, updatedAt: new Date() },
    });

  revalidatePath(`/vg-portal/events/${eventId}/intern`);
}

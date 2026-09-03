"use server";

import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isRegistrationClosed } from "@/lib/date";

export async function registerForEvent(eventId: number, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "vg_leader" || !session.vgLeaderId) redirect("/");
  const vgLeaderId = session.vgLeaderId;

  const [event] = await db
    .select({ registrationDeadline: events.registrationDeadline })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (isRegistrationClosed(event?.registrationDeadline ?? null)) return;

  const willAttend = formData.get("willAttend") === "true";

  await db
    .insert(eventRegistrations)
    .values({ eventId, vgLeaderId, willAttend })
    .onConflictDoUpdate({
      target: [eventRegistrations.eventId, eventRegistrations.vgLeaderId],
      set: { willAttend, updatedAt: new Date() },
    });

  revalidatePath(`/vg-portal/events/${eventId}`);
  revalidatePath("/vg-portal");
}

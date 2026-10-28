"use server";

import { db } from "@/db";
import { events, eventRegistrations, victoryGroupLeaders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isRegistrationClosed } from "@/lib/date";
import { isEventOpenToLeader } from "@/lib/eventAudience";

export async function registerForEvent(eventId: number, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "vg_leader" || !session.vgLeaderId) redirect("/");
  const vgLeaderId = session.vgLeaderId;

  const [[event], [leader]] = await Promise.all([
    db
      .select({ registrationDeadline: events.registrationDeadline, audience: events.audience })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1),
    db
      .select({ isLeadershipGroupLeader: victoryGroupLeaders.isLeadershipGroupLeader })
      .from(victoryGroupLeaders)
      .where(eq(victoryGroupLeaders.id, vgLeaderId))
      .limit(1),
  ]);
  if (!event || isRegistrationClosed(event.registrationDeadline)) return;
  if (!isEventOpenToLeader(event.audience, leader?.isLeadershipGroupLeader ?? false)) return;

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

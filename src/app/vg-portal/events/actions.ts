"use server";

import { db } from "@/db";
import { eventRegistrations, eventRegistrationInterns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function registerForEvent(eventId: number, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "vg_leader" || !session.vgLeaderId) redirect("/");
  const vgLeaderId = session.vgLeaderId;

  const willAttend = formData.get("willAttend") === "true";
  const internIds = formData.getAll("internId").map((v) => Number(v)).filter((n) => Number.isFinite(n));

  const [reg] = await db
    .insert(eventRegistrations)
    .values({ eventId, vgLeaderId, willAttend })
    .onConflictDoUpdate({
      target: [eventRegistrations.eventId, eventRegistrations.vgLeaderId],
      set: { willAttend, updatedAt: new Date() },
    })
    .returning({ id: eventRegistrations.id });

  await db.delete(eventRegistrationInterns).where(eq(eventRegistrationInterns.eventRegistrationId, reg.id));
  if (internIds.length > 0) {
    await db
      .insert(eventRegistrationInterns)
      .values(internIds.map((internId) => ({ eventRegistrationId: reg.id, internId })));
  }

  revalidatePath(`/vg-portal/events/${eventId}`);
  revalidatePath("/vg-portal");
}

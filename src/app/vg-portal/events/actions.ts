"use server";

import { db } from "@/db";
import { eventRegistrations } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function registerForEvent(eventId: number, formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "vg_leader" || !session.vgLeaderId) redirect("/");
  const vgLeaderId = session.vgLeaderId;

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

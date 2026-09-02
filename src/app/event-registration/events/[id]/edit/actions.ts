"use server";

import { db } from "@/db";
import { events, type eventAudienceEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toastRedirect } from "@/lib/toast";

type Audience = (typeof eventAudienceEnum.enumValues)[number];

export async function updateEvent(id: number, _: unknown, formData: FormData) {
  const name = ((formData.get("name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const eventDate = formData.get("eventDate") as string;
  const audience = formData.getAll("audience") as Audience[];
  const isDone = formData.get("isDone") === "on";

  if (!name || !eventDate) return { error: "Name and date are required." };
  if (audience.length === 0) return { error: "Select at least one audience." };

  await db
    .update(events)
    .set({ name, description: description || null, eventDate, audience, isDone })
    .where(eq(events.id, id));

  toastRedirect("/event-registration/events", "Event updated.");
}

export async function deleteEvent(id: number) {
  await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, id));
  toastRedirect("/event-registration/events", "Event deleted.");
}

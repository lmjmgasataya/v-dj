"use server";

import { db } from "@/db";
import { events, type eventAudienceEnum } from "@/db/schema";
import { toastRedirect } from "@/lib/toast";

type Audience = (typeof eventAudienceEnum.enumValues)[number];

export async function createEvent(_: unknown, formData: FormData) {
  const name = ((formData.get("name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const eventDate = formData.get("eventDate") as string;
  const audience = formData.getAll("audience") as Audience[];

  if (!name || !eventDate) return { error: "Name and date are required." };
  if (audience.length === 0) return { error: "Select at least one audience." };

  await db.insert(events).values({ name, description: description || null, eventDate, audience });

  toastRedirect("/event-registration/events", `"${name}" created.`);
}

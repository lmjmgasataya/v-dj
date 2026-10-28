"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { toastRedirect } from "@/lib/toast";
import { parseEventTimes, type EventAudience } from "@/lib/eventAudience";

export async function createEvent(_: unknown, formData: FormData) {
  const name = ((formData.get("name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const eventDate = formData.get("eventDate") as string;
  const { startTime, endTime, error: timeError } = parseEventTimes(formData);
  const registrationDeadline = (formData.get("registrationDeadline") as string) || null;
  const audience = formData.getAll("audience") as EventAudience[];

  if (!name || !eventDate) return { error: "Name and date are required." };
  if (timeError) return { error: timeError };
  if (audience.length === 0) return { error: "Select at least one audience." };

  await db
    .insert(events)
    .values({ name, description: description || null, eventDate, startTime, endTime, registrationDeadline, audience });

  toastRedirect("/event-registration/events", `"${name}" created.`);
}

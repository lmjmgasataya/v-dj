"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function toggleEventDone(id: number, isDone: boolean) {
  await db.update(events).set({ isDone }).where(eq(events.id, id));
  revalidatePath("/event-registration/events");
}

export async function getEventShareToken(id: number): Promise<string> {
  const [event] = await db.select({ shareToken: events.shareToken }).from(events).where(eq(events.id, id)).limit(1);
  if (event?.shareToken) return event.shareToken;

  const token = randomUUID().replace(/-/g, "");
  await db.update(events).set({ shareToken: token }).where(eq(events.id, id));
  return token;
}

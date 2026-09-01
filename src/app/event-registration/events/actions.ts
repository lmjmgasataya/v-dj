"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleEventDone(id: number, isDone: boolean) {
  await db.update(events).set({ isDone }).where(eq(events.id, id));
  revalidatePath("/event-registration/events");
}

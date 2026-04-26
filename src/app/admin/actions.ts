"use server";

import { db } from "@/db";
import { checkIns } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function checkInParticipant(participantId: number, classSessionId: number) {
  await db
    .insert(checkIns)
    .values({ participantId, classSessionId })
    .onConflictDoNothing();
  revalidatePath("/admin");
}

export async function removeCheckIn(participantId: number, classSessionId: number) {
  await db
    .delete(checkIns)
    .where(and(eq(checkIns.participantId, participantId), eq(checkIns.classSessionId, classSessionId)));
  revalidatePath("/admin");
}

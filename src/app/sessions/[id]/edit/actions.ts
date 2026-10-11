"use server";

import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { toastRedirect } from "@/lib/toast";

export async function updateSession(id: number, _: unknown, formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const sessionDate = formData.get("sessionDate") as string;

  if (!name || !sessionDate) return { error: "Name and date are required." };

  const isVictoryDay = name.includes("Victory Day");
  const vglOnly = formData.get("vglOnly") === "true";
  // Victory Day / walk-in rules are participant-only, so they don't apply to a VGL-only session.
  const requiresVictoryDay = !vglOnly && formData.get("requiresVictoryDay") === "true";
  const allowsWalkIn = !vglOnly && formData.get("allowsWalkIn") === "true";
  const batchIdRaw = formData.get("batchId") as string;
  const batchId = batchIdRaw ? Number(batchIdRaw) : null;

  await db.update(classSessions).set({ name, sessionDate, isVictoryDay, requiresVictoryDay, allowsWalkIn, vglOnly, batchId }).where(eq(classSessions.id, id));

  revalidatePath("/sessions");
  toastRedirect(`/sessions/${id}`, "Session updated.");
}

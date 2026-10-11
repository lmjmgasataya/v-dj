"use server";

import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { toastRedirect } from "@/lib/toast";

export async function createSession(_: unknown, formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const sessionDate = formData.get("sessionDate") as string;
  const isVictoryDay = name.includes("Victory Day");
  const vglOnly = formData.get("vglOnly") === "true";
  // Victory Day / walk-in rules are participant-only, so they don't apply to a VGL-only session.
  const requiresVictoryDay = !vglOnly && formData.get("requiresVictoryDay") === "true";
  const allowsWalkIn = !vglOnly && formData.get("allowsWalkIn") === "true";
  const batchIdRaw = formData.get("batchId") as string;
  const batchId = batchIdRaw ? Number(batchIdRaw) : null;

  if (!name || !sessionDate) return { error: "Name and date are required." };

  await db.insert(classSessions).values({ name, sessionDate, isVictoryDay, requiresVictoryDay, allowsWalkIn, vglOnly, batchId });

  revalidatePath("/sessions");
  toastRedirect("/sessions", `"${name}" created.`);
}

"use server";

import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSession(_: unknown, formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const sessionDate = formData.get("sessionDate") as string;
  const isVictoryDay = name.includes("Victory Day");
  const requiresVictoryDay = formData.get("requiresVictoryDay") === "true";
  const allowsWalkIn = formData.get("allowsWalkIn") === "true";
  const batchIdRaw = formData.get("batchId") as string;
  const batchId = batchIdRaw ? Number(batchIdRaw) : null;

  if (!name || !sessionDate) return { error: "Name and date are required." };

  await db.insert(classSessions).values({ name, sessionDate, isVictoryDay, requiresVictoryDay, allowsWalkIn, batchId });

  revalidatePath("/sessions");
  redirect(`/sessions?created=${encodeURIComponent(name)}`);
}

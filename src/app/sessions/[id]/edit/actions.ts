"use server";

import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateSession(id: number, _: unknown, formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const sessionDate = formData.get("sessionDate") as string;

  if (!name || !sessionDate) return { error: "Name and date are required." };

  const isVictoryDay = name.includes("Victory Day");
  const allowsWalkIn = formData.get("allowsWalkIn") === "true";

  await db.update(classSessions).set({ name, sessionDate, isVictoryDay, allowsWalkIn }).where(eq(classSessions.id, id));

  revalidatePath("/sessions");
  redirect(`/sessions/${id}?updated=1`);
}

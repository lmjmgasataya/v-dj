"use server";

import { db } from "@/db";
import { victoryGroups, type dayOfWeekEnum, type vgFrequencyEnum, type lifestageEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Day = (typeof dayOfWeekEnum.enumValues)[number];
type Frequency = (typeof vgFrequencyEnum.enumValues)[number];
type LifeStage = (typeof lifestageEnum.enumValues)[number];

function parseFrequency(formData: FormData) {
  const frequency = formData.get("frequency") as Frequency;
  const otherFrequency = frequency === "Others"
    ? ((formData.get("otherFrequency") as string) || null)
    : null;
  return { frequency, otherFrequency };
}

function parseLifeStage(formData: FormData) {
  const values = formData.getAll("lifeStage") as string[];
  return { lifeStage: values.length ? (values as LifeStage[]) : null };
}

function parseStatus(formData: FormData) {
  return { isActive: formData.get("activelyLeadingConfirmed") === "on" };
}

export async function addVictoryGroup(vgLeaderId: number, formData: FormData) {
  await db.insert(victoryGroups).values({
    vgLeaderId,
    place: formData.get("place") as string,
    day: formData.get("day") as Day,
    time: formData.get("time") as string,
    ...parseFrequency(formData),
    ...parseLifeStage(formData),
    ...parseStatus(formData),
    intern: (formData.get("intern") as string) || null,
  });
  revalidatePath(`/manage-vg-leaders/leaders/${vgLeaderId}/edit`);
}

export async function updateVictoryGroup(id: number, vgLeaderId: number, formData: FormData) {
  await db
    .update(victoryGroups)
    .set({
      place: formData.get("place") as string,
      day: formData.get("day") as Day,
      time: formData.get("time") as string,
      ...parseFrequency(formData),
      ...parseLifeStage(formData),
      ...parseStatus(formData),
      intern: (formData.get("intern") as string) || null,
    })
    .where(eq(victoryGroups.id, id));
  revalidatePath(`/manage-vg-leaders/leaders/${vgLeaderId}/edit`);
}

export async function deleteVictoryGroup(id: number, vgLeaderId: number) {
  await db
    .update(victoryGroups)
    .set({ deletedAt: new Date() })
    .where(eq(victoryGroups.id, id));
  revalidatePath(`/manage-vg-leaders/leaders/${vgLeaderId}/edit`);
}

"use server";

import { db } from "@/db";
import {
  victoryGroups,
  victoryGroupLeaders,
  type dayOfWeekEnum,
  type vgFrequencyEnum,
  type lifestageEnum,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/text";

type Day = (typeof dayOfWeekEnum.enumValues)[number];
type Frequency = (typeof vgFrequencyEnum.enumValues)[number];
type LifeStage = (typeof lifestageEnum.enumValues)[number];

async function requireVgLeader() {
  const session = await getSession();
  if (!session || session.role !== "vg_leader" || !session.vgLeaderId) redirect("/");
  return session as typeof session & { vgLeaderId: number };
}

function parseFrequency(formData: FormData) {
  const frequency = formData.get("frequency") as Frequency;
  const otherFrequency =
    frequency === "Others" ? ((formData.get("otherFrequency") as string) || null) : null;
  return { frequency, otherFrequency };
}

function parseLifeStage(formData: FormData) {
  const val = formData.get("lifeStage") as string;
  return { lifeStage: val ? (val as LifeStage) : null };
}

export async function addOwnVictoryGroup(formData: FormData) {
  const session = await requireVgLeader();
  await db.insert(victoryGroups).values({
    vgLeaderId: session.vgLeaderId,
    place: formData.get("place") as string,
    day: formData.get("day") as Day,
    time: formData.get("time") as string,
    ...parseFrequency(formData),
    ...parseLifeStage(formData),
  });
  revalidatePath("/vg-portal");
}

export async function updateOwnVictoryGroup(id: number, formData: FormData) {
  const session = await requireVgLeader();
  await db
    .update(victoryGroups)
    .set({
      place: formData.get("place") as string,
      day: formData.get("day") as Day,
      time: formData.get("time") as string,
      ...parseFrequency(formData),
      ...parseLifeStage(formData),
    })
    .where(and(eq(victoryGroups.id, id), eq(victoryGroups.vgLeaderId, session.vgLeaderId)));
  revalidatePath("/vg-portal");
}

export async function deleteOwnVictoryGroup(id: number) {
  const session = await requireVgLeader();
  await db
    .update(victoryGroups)
    .set({ deletedAt: new Date() })
    .where(and(eq(victoryGroups.id, id), eq(victoryGroups.vgLeaderId, session.vgLeaderId)));
  revalidatePath("/vg-portal");
}

export async function updateOwnProfile(formData: FormData) {
  const session = await requireVgLeader();
  await db
    .update(victoryGroupLeaders)
    .set({
      middleInitial: toTitleCase((formData.get("middleInitial") as string) || "") || null,
      mobileNumber: formData.get("mobileNumber") as string,
      age: formData.get("age") ? Number(formData.get("age")) : null,
      gender: (formData.get("gender") as string) || null,
      lifestage: (formData.get("lifestage") as LifeStage) || null,
      serviceAttending: (formData.get("serviceAttending") as string) || null,
      facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
    })
    .where(eq(victoryGroupLeaders.id, session.vgLeaderId));
  revalidatePath("/vg-portal");
}

"use server";

import { db } from "@/db";
import {
  victoryGroups,
  victoryGroupLeaders,
  users,
  type dayOfWeekEnum,
  type vgFrequencyEnum,
  type lifestageEnum,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/text";
import { recomputeProfileCompleted } from "@/lib/vgLeaderProfile";

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
  const values = formData.getAll("lifeStage") as string[];
  return { lifeStage: values.length ? (values as LifeStage[]) : null };
}

function parseStatus(formData: FormData) {
  return { isActive: formData.get("activelyLeadingConfirmed") === "on" };
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
    ...parseStatus(formData),
    intern: (formData.get("intern") as string) || null,
  });
  await recomputeProfileCompleted(session.vgLeaderId);
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
      ...parseStatus(formData),
      intern: (formData.get("intern") as string) || null,
    })
    .where(and(eq(victoryGroups.id, id), eq(victoryGroups.vgLeaderId, session.vgLeaderId)));
  await recomputeProfileCompleted(session.vgLeaderId);
  revalidatePath("/vg-portal");
}

export async function deleteOwnVictoryGroup(id: number) {
  const session = await requireVgLeader();
  await db
    .update(victoryGroups)
    .set({ deletedAt: new Date() })
    .where(and(eq(victoryGroups.id, id), eq(victoryGroups.vgLeaderId, session.vgLeaderId)));
  await recomputeProfileCompleted(session.vgLeaderId);
  revalidatePath("/vg-portal");
}

export async function updateOwnProfile(formData: FormData) {
  const session = await requireVgLeader();
  const [updated] = await db
    .update(victoryGroupLeaders)
    .set({
      firstName: toTitleCase(formData.get("firstName") as string),
      middleInitial: toTitleCase((formData.get("middleInitial") as string) || "") || null,
      nickname: (formData.get("nickname") as string) || null,
      mobileNumber: formData.get("mobileNumber") as string,
      age: formData.get("age") ? Number(formData.get("age")) : null,
      gender: (formData.get("gender") as string) || null,
      lifestage: (formData.get("lifestage") as LifeStage) || null,
      serviceAttending: (formData.get("serviceAttending") as string) || null,
      facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
      discipleshipJourneyCompleted: formData.getAll("discipleshipJourneyCompleted").join(",") || null,
      graduateOfLeadership113:
        formData.get("graduateOfLeadership113") === ""
          ? null
          : formData.get("graduateOfLeadership113") === "true",
      ownVgLeaderName: (formData.get("ownVgLeaderName") as string) || null,
      ownVgLeaderId: formData.get("ownVgLeaderId") ? Number(formData.get("ownVgLeaderId")) : null,
    })
    .where(eq(victoryGroupLeaders.id, session.vgLeaderId))
    .returning();

  // Keep the account's display name (used in the header and future session tokens) in sync.
  await db
    .update(users)
    .set({ name: `${updated.firstName} ${updated.lastName}` })
    .where(eq(users.vgLeaderId, session.vgLeaderId));

  await recomputeProfileCompleted(session.vgLeaderId);
  revalidatePath("/vg-portal");
}

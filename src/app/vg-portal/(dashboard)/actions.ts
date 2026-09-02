"use server";

import { db } from "@/db";
import {
  victoryGroups,
  victoryGroupLeaders,
  users,
  type dayOfWeekEnum,
  type vgFrequencyEnum,
  type lifestageEnum,
  type startedLeadingVgEnum,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/text";
import { recomputeProfileCompleted } from "@/lib/vgLeaderProfile";
import { resolveOwnVgLeader } from "@/lib/ownVgLeader";
import { replaceGroupInterns } from "@/lib/interns";
import { resolveLeadershipGroupMembers, replaceLeadershipGroupMembers } from "@/lib/leadershipGroupMembers";
import { toastRedirect } from "@/lib/toast";

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

export async function addOwnVictoryGroup(formData: FormData) {
  const session = await requireVgLeader();
  const [group] = await db
    .insert(victoryGroups)
    .values({
      vgLeaderId: session.vgLeaderId,
      place: formData.get("place") as string,
      day: formData.get("day") as Day,
      time: formData.get("time") as string,
      ...parseFrequency(formData),
      ...parseLifeStage(formData),
      isActive: true,
    })
    .returning({ id: victoryGroups.id });
  await replaceGroupInterns(group.id, formData);
  await recomputeProfileCompleted(session.vgLeaderId);
  revalidatePath("/vg-portal");
  revalidatePath("/vg-portal/profile");
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
  await replaceGroupInterns(id, formData);
  await recomputeProfileCompleted(session.vgLeaderId);
  revalidatePath("/vg-portal");
  revalidatePath("/vg-portal/profile");
}

export async function deleteOwnVictoryGroup(id: number) {
  const session = await requireVgLeader();
  await db
    .update(victoryGroups)
    .set({ deletedAt: new Date() })
    .where(and(eq(victoryGroups.id, id), eq(victoryGroups.vgLeaderId, session.vgLeaderId)));
  await recomputeProfileCompleted(session.vgLeaderId);
  revalidatePath("/vg-portal");
  revalidatePath("/vg-portal/profile");
}

export async function updateOwnProfile(formData: FormData) {
  const session = await requireVgLeader();
  const ownVgLeader = await resolveOwnVgLeader(formData, session.vgLeaderId);
  const isLeadershipGroupLeader = formData.get("isLeadershipGroupLeader") === "true";
  const memberIds = isLeadershipGroupLeader
    ? await resolveLeadershipGroupMembers(formData, session.vgLeaderId)
    : [];

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
        formData.get("graduateOfLeadership113")
          ? formData.get("graduateOfLeadership113") === "true"
          : null,
      ...ownVgLeader,
      startedLeadingVg: (formData.get("startedLeadingVg") as (typeof startedLeadingVgEnum.enumValues)[number]) || null,
      isLeadershipGroupLeader,
      isActive: formData.get("isActive") === "on",
      updatedAt: new Date(),
    })
    .where(eq(victoryGroupLeaders.id, session.vgLeaderId))
    .returning();

  await replaceLeadershipGroupMembers(session.vgLeaderId, memberIds);

  // Keep the account's display name (used in the header and future session tokens) in sync.
  await db
    .update(users)
    .set({ name: `${updated.firstName} ${updated.lastName}` })
    .where(eq(users.vgLeaderId, session.vgLeaderId));

  await recomputeProfileCompleted(session.vgLeaderId);
  revalidatePath("/vg-portal");
  revalidatePath("/vg-portal/profile");

  toastRedirect("/vg-portal", "Profile updated.");
}

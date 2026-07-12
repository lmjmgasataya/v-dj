"use server";

import { db } from "@/db";
import { participants, disciplers, victoryGroupLeaders, type lifestageEnum } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/text";

type Lifestage = (typeof lifestageEnum.enumValues)[number];

async function upsertDiscipler(
  lastName: string,
  firstName: string,
  mobileNumber: string,
  messengerName: string | null,
): Promise<number> {
  await db.insert(disciplers).values({ lastName, firstName, mobileNumber, messengerName }).onConflictDoNothing();
  const [d] = await db
    .select({ id: disciplers.id })
    .from(disciplers)
    .where(and(eq(disciplers.lastName, lastName), eq(disciplers.firstName, firstName), eq(disciplers.mobileNumber, mobileNumber)));
  return d.id;
}

async function upsertVgLeader(
  lastName: string,
  firstName: string,
  mobileNumber: string,
  messengerName: string | null,
): Promise<number> {
  await db.insert(victoryGroupLeaders).values({ lastName, firstName, mobileNumber, facebookMessengerName: messengerName }).onConflictDoNothing();
  const [v] = await db
    .select({ id: victoryGroupLeaders.id })
    .from(victoryGroupLeaders)
    .where(and(eq(victoryGroupLeaders.lastName, lastName), eq(victoryGroupLeaders.firstName, firstName), eq(victoryGroupLeaders.mobileNumber, mobileNumber)));
  return v.id;
}

const STUDENT_LIFESTAGES = ["Student (JHS/SHS)", "Student (College)"];

export async function updateParticipant(id: number, formData: FormData) {
  const registrationFee = formData.get("registrationFee") as string;
  const isAB = registrationFee === "A" || registrationFee === "B";
  const needsVictoryDate = registrationFee === "C" || registrationFee === "D";
  const isDoneWithVictoryWeekend = isAB && formData.get("isDoneWithVictoryWeekend") === "yes";
  const showVgLeader = needsVictoryDate || isDoneWithVictoryWeekend;

  const previousChurchRaw = formData.get("previousChurch") as string;
  const previousChurchOther = formData.get("previousChurchOther") as string;
  const previousChurch =
    previousChurchRaw === "Others" ? previousChurchOther : previousChurchRaw;

  let disciplerId: number | null = null;
  let vgLeaderId: number | null = null;

  if (showVgLeader) {
    const lastName = toTitleCase((formData.get("vgLeaderLastName") as string) || "");
    const firstName = toTitleCase((formData.get("vgLeaderFirstName") as string) || "");
    const mobileNumber = (formData.get("vgLeaderMobileNumber") as string) || "";
    if (lastName && firstName && mobileNumber) {
      vgLeaderId = await upsertVgLeader(lastName, firstName, mobileNumber, (formData.get("vgLeaderMessengerName") as string) || null);
    }
  } else {
    const lastName = toTitleCase((formData.get("disciplerLastName") as string) || "");
    const firstName = toTitleCase((formData.get("disciplerFirstName") as string) || "");
    const mobileNumber = (formData.get("disciplerMobileNumber") as string) || "";
    if (lastName && firstName && mobileNumber) {
      disciplerId = await upsertDiscipler(lastName, firstName, mobileNumber, (formData.get("disciplerMessengerName") as string) || null);
    }
  }

  await db.update(participants).set({
    lastName: toTitleCase(formData.get("lastName") as string),
    firstName: toTitleCase(formData.get("firstName") as string),
    middleInitial: toTitleCase((formData.get("middleInitial") as string) || "") || null,
    mobileNumber: formData.get("mobileNumber") as string,
    facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
    lifestage: formData.get("lifestage") as Lifestage,
    age: Number(formData.get("age")),
    gender: formData.get("gender") as string,
    serviceAttending: formData.get("serviceAttending") as string,
    completedOne2One: !showVgLeader ? formData.get("completedOne2One") === "yes" : null,
    willUndergoWaterBaptism: !showVgLeader ? formData.get("willUndergoWaterBaptism") === "yes" : null,
    previousChurch: !showVgLeader ? previousChurch : null,
    isDoneWithVictoryWeekend: isAB ? isDoneWithVictoryWeekend : null,
    preferredNameOnId: toTitleCase(formData.get("preferredNameOnId") as string),
    disciplerId,
    confirmedReadiness: !showVgLeader ? formData.get("confirmedReadiness") === "on" : null,
    vgLeaderId,
    email: (formData.get("email") as string) || null,
    school: STUDENT_LIFESTAGES.includes(formData.get("lifestage") as string)
      ? (formData.get("school") as string) || null
      : null,
    acknowledgementReceiptNumber: formData.get("acknowledgementReceiptNumber") as string,
    registrationFee,
    worshipServiceRegistered: (formData.get("worshipServiceRegistered") as string) || null,
    adminVolunteerName: toTitleCase(formData.get("adminVolunteerName") as string),
    victoryDate: (formData.get("victoryDate") as string) || null,
  }).where(eq(participants.id, id));

  redirect("/participants?updated=1");
}

export async function deleteParticipant(id: number) {
  await db
    .update(participants)
    .set({ deletedAt: new Date() })
    .where(eq(participants.id, id));
  redirect("/participants");
}

export async function restoreParticipant(id: number) {
  await db
    .update(participants)
    .set({ deletedAt: null })
    .where(eq(participants.id, id));
  redirect("/participants/deleted");
}

"use server";

import { db } from "@/db";
import { participants, disciplers, victoryGroupLeaders, batches, type lifestageEnum } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

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

export async function registerParticipant(formData: FormData) {
  const registrationFee = formData.get("registrationFee") as string;
  const isAB = registrationFee === "A" || registrationFee === "B";
  const needsVictoryDate = registrationFee === "C" || registrationFee === "D";
  const isDoneWithVictoryWeekend = isAB && formData.get("isDoneWithVictoryWeekend") === "on";
  const showVgLeader = needsVictoryDate || isDoneWithVictoryWeekend;

  const previousChurchRaw = formData.get("previousChurch") as string;
  const previousChurchOther = formData.get("previousChurchOther") as string;
  const previousChurch =
    previousChurchRaw === "Others" ? previousChurchOther : previousChurchRaw;

  let disciplerId: number | null = null;
  let vgLeaderId: number | null = null;

  if (showVgLeader) {
    vgLeaderId = await upsertVgLeader(
      formData.get("vgLeaderLastName") as string,
      formData.get("vgLeaderFirstName") as string,
      formData.get("vgLeaderMobileNumber") as string,
      (formData.get("vgLeaderMessengerName") as string) || null,
    );
  } else {
    disciplerId = await upsertDiscipler(
      formData.get("disciplerLastName") as string,
      formData.get("disciplerFirstName") as string,
      formData.get("disciplerMobileNumber") as string,
      (formData.get("disciplerMessengerName") as string) || null,
    );
  }

  const defaultBatch = await db
    .select({ id: batches.id })
    .from(batches)
    .where(eq(batches.isDefault, true))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  await db.insert(participants).values({
    lastName: formData.get("lastName") as string,
    firstName: formData.get("firstName") as string,
    middleInitial: (formData.get("middleInitial") as string) || null,
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
    preferredNameOnId: formData.get("preferredNameOnId") as string,
    disciplerId,
    confirmedReadiness: !showVgLeader ? formData.get("confirmedReadiness") === "on" : null,
    vgLeaderId,
    acknowledgementReceiptNumber: formData.get("acknowledgementReceiptNumber") as string,
    registrationFee,
    victoryDate: (formData.get("victoryDate") as string) || null,
    adminVolunteerName: formData.get("adminVolunteerName") as string,
    batchId: defaultBatch?.id ?? null,
  });

  redirect("/register/success");
}

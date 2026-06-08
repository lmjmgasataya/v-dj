"use server";

import { db } from "@/db";
import { participants, disciplers, victoryGroupLeaders, type lifestageEnum } from "@/db/schema";
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
  const isVGLeaderFlow = registrationFee === "C" || registrationFee === "D";

  const previousChurchRaw = formData.get("previousChurch") as string;
  const previousChurchOther = formData.get("previousChurchOther") as string;
  const previousChurch =
    previousChurchRaw === "Others" ? previousChurchOther : previousChurchRaw;

  if (isVGLeaderFlow) {
    const vgLeaderLastName = formData.get("vgLeaderLastName") as string;
    const vgLeaderFirstName = formData.get("vgLeaderFirstName") as string;
    const vgLeaderMobileNumber = formData.get("vgLeaderMobileNumber") as string;
    const vgLeaderMessengerName = (formData.get("vgLeaderMessengerName") as string) || null;

    const vgLeaderId = await upsertVgLeader(
      vgLeaderLastName,
      vgLeaderFirstName,
      vgLeaderMobileNumber,
      vgLeaderMessengerName,
    );

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
      preferredNameOnId: formData.get("preferredNameOnId") as string,
      vgLeaderId,
      acknowledgementReceiptNumber: formData.get("acknowledgementReceiptNumber") as string,
      registrationFee,
      victoryDate: (formData.get("victoryDate") as string) || null,
      adminVolunteerName: formData.get("adminVolunteerName") as string,
    });
  } else {
    const disciplerLastName = formData.get("disciplerLastName") as string;
    const disciplerFirstName = formData.get("disciplerFirstName") as string;
    const disciplerMobileNumber = formData.get("disciplerMobileNumber") as string;
    const disciplerMessengerName = (formData.get("disciplerMessengerName") as string) || null;

    const disciplerId = await upsertDiscipler(
      disciplerLastName,
      disciplerFirstName,
      disciplerMobileNumber,
      disciplerMessengerName,
    );

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
      completedOne2One: formData.get("completedOne2One") === "yes",
      willUndergoWaterBaptism: formData.get("willUndergoWaterBaptism") === "yes",
      previousChurch,
      preferredNameOnId: formData.get("preferredNameOnId") as string,
      disciplerId,
      confirmedReadiness: formData.get("confirmedReadiness") === "on",
      acknowledgementReceiptNumber: formData.get("acknowledgementReceiptNumber") as string,
      registrationFee,
      victoryDate: (formData.get("victoryDate") as string) || null,
      adminVolunteerName: formData.get("adminVolunteerName") as string,
    });
  }

  redirect("/register/success");
}

"use server";

import { db } from "@/db";
import { participants, disciplers, type lifestageEnum } from "@/db/schema";
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

export async function updateParticipant(id: number, formData: FormData) {
  const previousChurchRaw = formData.get("previousChurch") as string;
  const previousChurchOther = formData.get("previousChurchOther") as string;
  const previousChurch =
    previousChurchRaw === "Others" ? previousChurchOther : previousChurchRaw;

  const disciplerLastName = formData.get("disciplerLastName") as string;
  const disciplerFirstName = formData.get("disciplerFirstName") as string;
  const disciplerMobileNumber = formData.get("disciplerMobileNumber") as string;
  const disciplerMessengerName = (formData.get("disciplerMessengerName") as string) || null;

  let disciplerId: number | null = null;
  if (disciplerLastName && disciplerFirstName && disciplerMobileNumber) {
    disciplerId = await upsertDiscipler(
      disciplerLastName,
      disciplerFirstName,
      disciplerMobileNumber,
      disciplerMessengerName,
    );
  }

  await db.update(participants).set({
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
    registrationFee: formData.get("registrationFee") as string,
    adminVolunteerName: formData.get("adminVolunteerName") as string,
    vgLeaderLastName: (formData.get("vgLeaderLastName") as string) || null,
    vgLeaderFirstName: (formData.get("vgLeaderFirstName") as string) || null,
    victoryDate: (formData.get("victoryDate") as string) || null,
  }).where(eq(participants.id, id));

  redirect("/participants");
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

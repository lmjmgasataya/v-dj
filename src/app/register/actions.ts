"use server";

import { db } from "@/db";
import { participants, type lifestageEnum } from "@/db/schema";
import { redirect } from "next/navigation";

type Lifestage = (typeof lifestageEnum.enumValues)[number];

export async function registerParticipant(formData: FormData) {
  const previousChurchRaw = formData.get("previousChurch") as string;
  const previousChurchOther = formData.get("previousChurchOther") as string;
  const previousChurch =
    previousChurchRaw === "Others" ? previousChurchOther : previousChurchRaw;

  await db.insert(participants).values({
    lastName: formData.get("lastName") as string,
    firstName: formData.get("firstName") as string,
    middleInitial: (formData.get("middleInitial") as string) || null,
    mobileNumber: formData.get("mobileNumber") as string,
    facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
    lifestage: formData.get("lifestage") as Lifestage,
    birthday: formData.get("birthday") as string,
    gender: formData.get("gender") as string,
    serviceAttending: formData.get("serviceAttending") as string,
    completedOne2One: formData.get("completedOne2One") === "yes",
    willUndergoWaterBaptism: formData.get("willUndergoWaterBaptism") === "yes",
    previousChurch,
    preferredNameOnId: formData.get("preferredNameOnId") as string,
    disciplerLastName: formData.get("disciplerLastName") as string,
    disciplerFirstName: formData.get("disciplerFirstName") as string,
    disciplerMobileNumber: formData.get("disciplerMobileNumber") as string,
    disciplerMessengerName: (formData.get("disciplerMessengerName") as string) || null,
    confirmedReadiness: formData.get("confirmedReadiness") === "on",
    acknowledgementReceiptNumber: formData.get("acknowledgementReceiptNumber") as string,
    registrationFee: formData.get("registrationFee") as string,
    adminVolunteerName: formData.get("adminVolunteerName") as string,
  });

  redirect("/register/success");
}

"use server";

import { db } from "@/db";
import { participants, disciplers, type lifestageEnum } from "@/db/schema";
import { redirect } from "next/navigation";

type Lifestage = (typeof lifestageEnum.enumValues)[number];

export async function registerParticipant(formData: FormData) {
  const previousChurchRaw = formData.get("previousChurch") as string;
  const previousChurchOther = formData.get("previousChurchOther") as string;
  const previousChurch =
    previousChurchRaw === "Others" ? previousChurchOther : previousChurchRaw;

  const disciplerLastName = formData.get("disciplerLastName") as string;
  const disciplerFirstName = formData.get("disciplerFirstName") as string;
  const disciplerMobileNumber = formData.get("disciplerMobileNumber") as string;
  const disciplerMessengerName = (formData.get("disciplerMessengerName") as string) || null;

  await Promise.all([
    db.insert(participants).values({
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
      disciplerLastName,
      disciplerFirstName,
      disciplerMobileNumber,
      disciplerMessengerName,
      confirmedReadiness: formData.get("confirmedReadiness") === "on",
      acknowledgementReceiptNumber: formData.get("acknowledgementReceiptNumber") as string,
      registrationFee: formData.get("registrationFee") as string,
      adminVolunteerName: formData.get("adminVolunteerName") as string,
    }),
    db.insert(disciplers).values({
      lastName: disciplerLastName,
      firstName: disciplerFirstName,
      mobileNumber: disciplerMobileNumber,
      messengerName: disciplerMessengerName,
    }).onConflictDoNothing(),
  ]);

  redirect("/register/success");
}

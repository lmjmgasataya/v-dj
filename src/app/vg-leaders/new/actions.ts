"use server";

import { db } from "@/db";
import { victoryGroupLeaders, type lifestageEnum } from "@/db/schema";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/text";

type Lifestage = (typeof lifestageEnum.enumValues)[number];

export async function createVGLeader(formData: FormData) {
  await db.insert(victoryGroupLeaders).values({
    lastName: toTitleCase(formData.get("lastName") as string),
    firstName: toTitleCase(formData.get("firstName") as string),
    middleInitial: toTitleCase((formData.get("middleInitial") as string) || "") || null,
    mobileNumber: formData.get("mobileNumber") as string,
    age: Number(formData.get("age")),
    gender: formData.get("gender") as string,
    lifestage: (formData.get("lifestage") as Lifestage) || null,
    serviceAttending: (formData.get("serviceAttending") as string) || null,
    facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
  });

  redirect("/vg-leaders");
}

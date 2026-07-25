"use server";

import { db } from "@/db";
import { victoryGroupLeaders, type lifestageEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toastRedirect } from "@/lib/toast";
import { toTitleCase } from "@/lib/text";

type Lifestage = (typeof lifestageEnum.enumValues)[number];

export async function updateVGLeader(id: number, formData: FormData) {
  await db
    .update(victoryGroupLeaders)
    .set({
      lastName: toTitleCase(formData.get("lastName") as string),
      firstName: toTitleCase(formData.get("firstName") as string),
      middleInitial: toTitleCase((formData.get("middleInitial") as string) || "") || null,
      mobileNumber: formData.get("mobileNumber") as string,
      age: Number(formData.get("age")),
      gender: formData.get("gender") as string,
      lifestage: (formData.get("lifestage") as Lifestage) || null,
      serviceAttending: (formData.get("serviceAttending") as string) || null,
      facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
    })
    .where(eq(victoryGroupLeaders.id, id));

  toastRedirect("/vg-leaders", "VG leader updated.");
}

export async function deleteVGLeader(id: number) {
  await db
    .update(victoryGroupLeaders)
    .set({ deletedAt: new Date() })
    .where(eq(victoryGroupLeaders.id, id));
  toastRedirect("/vg-leaders", "VG leader deleted.");
}

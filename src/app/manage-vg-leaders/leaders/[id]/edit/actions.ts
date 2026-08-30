"use server";

import { db } from "@/db";
import { victoryGroupLeaders, type lifestageEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { toastRedirect, toastRedirectBack } from "@/lib/toast";
import { toTitleCase } from "@/lib/text";
import { resolveOwnVgLeader } from "@/lib/ownVgLeader";

type Lifestage = (typeof lifestageEnum.enumValues)[number];

export async function updateVGLeader(id: number, formData: FormData) {
  const ownVgLeader = await resolveOwnVgLeader(formData, id);
  await db
    .update(victoryGroupLeaders)
    .set({
      lastName: toTitleCase(formData.get("lastName") as string),
      firstName: toTitleCase(formData.get("firstName") as string),
      middleInitial: toTitleCase((formData.get("middleInitial") as string) || "") || null,
      nickname: (formData.get("nickname") as string) || null,
      mobileNumber: formData.get("mobileNumber") as string,
      age: Number(formData.get("age")),
      gender: formData.get("gender") as string,
      lifestage: (formData.get("lifestage") as Lifestage) || null,
      serviceAttending: (formData.get("serviceAttending") as string) || null,
      facebookMessengerName: (formData.get("facebookMessengerName") as string) || null,
      discipleshipJourneyCompleted: formData.getAll("discipleshipJourneyCompleted").join(",") || null,
      graduateOfLeadership113:
        formData.get("graduateOfLeadership113") === ""
          ? null
          : formData.get("graduateOfLeadership113") === "true",
      ...ownVgLeader,
      isActive: formData.get("isActive") === "on",
      updatedAt: new Date(),
    })
    .where(eq(victoryGroupLeaders.id, id));

  toastRedirect("/manage-vg-leaders/leaders", "VG leader updated.");
}

export async function acknowledgeLeaderCurrent(id: number) {
  await db
    .update(victoryGroupLeaders)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(victoryGroupLeaders.id, id));
  revalidatePath(`/manage-vg-leaders/leaders/${id}`);
  await toastRedirectBack("Marked as current.");
}

export async function deleteVGLeader(id: number) {
  await db
    .update(victoryGroupLeaders)
    .set({ deletedAt: new Date() })
    .where(eq(victoryGroupLeaders.id, id));
  toastRedirect("/manage-vg-leaders/leaders", "VG leader deleted.");
}

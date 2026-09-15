"use server";

import { db } from "@/db";
import { victoryGroupLeaders, type lifestageEnum, type startedLeadingVgEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toastRedirect } from "@/lib/toast";
import { toTitleCase } from "@/lib/text";
import { resolveOwnVgLeader } from "@/lib/ownVgLeader";
import { resolveLeadershipGroupMembers, replaceLeadershipGroupMembers } from "@/lib/leadershipGroupMembers";
import { MOBILE_NUMBER_REGEX } from "@/lib/phone";

type Lifestage = (typeof lifestageEnum.enumValues)[number];

export async function updateVGLeader(id: number, formData: FormData) {
  const mobileNumber = formData.get("mobileNumber") as string;
  if (!MOBILE_NUMBER_REGEX.test(mobileNumber)) {
    throw new Error("Invalid mobile number format.");
  }
  const ownVgLeader = await resolveOwnVgLeader(formData, id);
  const isLeadershipGroupLeader = formData.get("isLeadershipGroupLeader") === "true";
  const memberIds = isLeadershipGroupLeader ? await resolveLeadershipGroupMembers(formData, id) : [];

  await db
    .update(victoryGroupLeaders)
    .set({
      lastName: toTitleCase(formData.get("lastName") as string),
      firstName: toTitleCase(formData.get("firstName") as string),
      middleInitial: toTitleCase((formData.get("middleInitial") as string) || "") || null,
      nickname: (formData.get("nickname") as string) || null,
      mobileNumber,
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
      startedLeadingVg: (formData.get("startedLeadingVg") as (typeof startedLeadingVgEnum.enumValues)[number]) || null,
      isLeadershipGroupLeader,
      updatedAt: new Date(),
    })
    .where(eq(victoryGroupLeaders.id, id));

  await replaceLeadershipGroupMembers(id, memberIds);

  toastRedirect("/vg-leader-portal/leaders", "VG leader updated.");
}

export async function deleteVGLeader(id: number) {
  await db
    .update(victoryGroupLeaders)
    .set({ deletedAt: new Date() })
    .where(eq(victoryGroupLeaders.id, id));
  toastRedirect("/vg-leader-portal/leaders", "VG leader deleted.");
}

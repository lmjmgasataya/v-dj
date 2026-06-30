"use server";

import { db } from "@/db";
import { participants, disciplers, victoryGroupLeaders, batches, type lifestageEnum } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/text";
import { isRegistrationSmsEnabled, getRegistrationSmsTemplate, sendSms } from "@/lib/sms";

type Lifestage = (typeof lifestageEnum.enumValues)[number];

async function upsertDiscipler(
  lastName: string,
  firstName: string,
  mobileNumber: string,
  messengerName: string | null,
): Promise<number> {
  await db.insert(disciplers).values({ lastName, firstName, mobileNumber, messengerName }).onConflictDoUpdate({
    target: [disciplers.lastName, disciplers.firstName, disciplers.mobileNumber],
    set: { messengerName },
  });
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
  await db.insert(victoryGroupLeaders).values({ lastName, firstName, mobileNumber, facebookMessengerName: messengerName }).onConflictDoUpdate({
    target: [victoryGroupLeaders.lastName, victoryGroupLeaders.firstName, victoryGroupLeaders.mobileNumber],
    set: { facebookMessengerName: messengerName },
  });
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
  const isDoneWithVictoryWeekend = isAB && formData.get("isDoneWithVictoryWeekend") === "yes";
  const showVgLeader = needsVictoryDate || isDoneWithVictoryWeekend;

  const previousChurchRaw = formData.get("previousChurch") as string;
  const previousChurchOther = formData.get("previousChurchOther") as string;
  const previousChurch =
    previousChurchRaw === "Others" ? previousChurchOther : previousChurchRaw;

  let disciplerId: number | null = null;
  let vgLeaderId: number | null = null;

  if (showVgLeader) {
    const vgLastName = toTitleCase(formData.get("vgLeaderLastName") as string);
    const vgFirstName = toTitleCase(formData.get("vgLeaderFirstName") as string);
    const vgMobile = (formData.get("vgLeaderMobileNumber") as string) || "";
    if (vgLastName && vgFirstName && vgMobile) {
      vgLeaderId = await upsertVgLeader(
        vgLastName,
        vgFirstName,
        vgMobile,
        (formData.get("vgLeaderMessengerName") as string) || null,
      );
    }
  } else {
    const discLastName = toTitleCase(formData.get("disciplerLastName") as string);
    const discFirstName = toTitleCase(formData.get("disciplerFirstName") as string);
    const discMobile = (formData.get("disciplerMobileNumber") as string) || "";
    if (discLastName && discFirstName && discMobile) {
      disciplerId = await upsertDiscipler(
        discLastName,
        discFirstName,
        discMobile,
        (formData.get("disciplerMessengerName") as string) || null,
      );
    }
  }

  const defaultBatch = await db
    .select({ id: batches.id })
    .from(batches)
    .where(eq(batches.isDefault, true))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  await db.insert(participants).values({
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
    willUndergoWaterBaptism: isAB ? formData.get("willUndergoWaterBaptism") === "yes" : null,
    previousChurch: !showVgLeader ? previousChurch : null,
    isDoneWithVictoryWeekend: isAB ? isDoneWithVictoryWeekend : null,
    preferredNameOnId: toTitleCase(formData.get("preferredNameOnId") as string),
    disciplerId,
    confirmedReadiness: !showVgLeader ? formData.get("confirmedReadiness") === "on" : null,
    vgLeaderId,
    acknowledgementReceiptNumber: formData.get("acknowledgementReceiptNumber") as string,
    registrationFee,
    victoryDate: (formData.get("victoryDate") as string) || null,
    email: (formData.get("email") as string) || null,
    worshipServiceRegistered: (formData.get("worshipServiceRegistered") as string) || null,
    adminVolunteerName: toTitleCase(formData.get("adminVolunteerName") as string),
    batchId: defaultBatch?.id ?? null,
  });

  try {
    if (await isRegistrationSmsEnabled()) {
      const template = await getRegistrationSmsTemplate(registrationFee);
      if (template) {
        const firstName = toTitleCase(formData.get("firstName") as string);
        const lastName = toTitleCase(formData.get("lastName") as string);
        const message = template
          .replace(/\{firstName\}/gi, firstName)
          .replace(/\{lastName\}/gi, lastName)
          .replace(/\{name\}/gi, `${firstName} ${lastName}`);
        await sendSms(formData.get("mobileNumber") as string, message);
      }
    }
  } catch {
    console.error("Failed to send registration SMS");
    // SMS failure must not block registration
  }

  redirect("/register/success");
}

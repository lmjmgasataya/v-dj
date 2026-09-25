"use server";

import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toastRedirectBack } from "@/lib/toast";
import { ACCEPT_PREVIOUS_QUARTER_FLAG } from "@/lib/vgQuarters";

export async function setAcceptPreviousQuarterFlag(enabled: boolean) {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  await db
    .insert(featureFlags)
    .values({ key: ACCEPT_PREVIOUS_QUARTER_FLAG, enabled })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedAt: new Date() },
    });

  revalidatePath("/vg-leader-portal");
  revalidatePath("/vg-portal");
  await toastRedirectBack("Setting updated.");
}

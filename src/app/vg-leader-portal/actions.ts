"use server";

import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toastRedirectBack } from "@/lib/toast";
import { ACCEPT_PREVIOUS_QUARTER_FLAG, CARRY_OVER_PREVIOUS_QUARTER_FLAG } from "@/lib/vgQuarters";

const QUARTER_FLAGS = [ACCEPT_PREVIOUS_QUARTER_FLAG, CARRY_OVER_PREVIOUS_QUARTER_FLAG];

export async function setQuarterFlag(key: string, enabled: boolean) {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
  if (!QUARTER_FLAGS.includes(key)) throw new Error("Unknown setting.");

  await db
    .insert(featureFlags)
    .values({ key, enabled })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedAt: new Date() },
    });

  revalidatePath("/vg-leader-portal");
  revalidatePath("/vg-portal");
  await toastRedirectBack("Setting updated.");
}

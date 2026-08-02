"use server";

import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toastRedirectBack } from "@/lib/toast";

const SETTINGS_FLAG_KEYS = ["checkin_confirm_popup", "checkin_table_assignment"] as const;
type SettingsFlagKey = (typeof SETTINGS_FLAG_KEYS)[number];

async function requireSession() {
  const session = await getSession();
  if (!session || session.role === "vg_leader") redirect("/");
  return session;
}

export async function setCheckinFlag(key: SettingsFlagKey, enabled: boolean) {
  await requireSession();
  if (!SETTINGS_FLAG_KEYS.includes(key)) return;

  await db
    .insert(featureFlags)
    .values({ key, enabled })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedAt: new Date() },
    });

  revalidatePath("/settings");
  revalidatePath("/admin");
  await toastRedirectBack("Setting updated.");
}

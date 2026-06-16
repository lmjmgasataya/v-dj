"use server";

import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const FLAG_KEY = "print_id_show_fullname";

export async function toggleShowFullName() {
  await db
    .insert(featureFlags)
    .values({ key: FLAG_KEY, enabled: true })
    .onConflictDoUpdate({ target: featureFlags.key, set: { enabled: sql`NOT ${featureFlags.enabled}`, updatedAt: new Date() } });
  revalidatePath("/participants/print-ids");
}

"use server";

import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function toggleFlag(key: string) {
  await requireDeveloper();
  await db
    .update(featureFlags)
    .set({ enabled: sql`NOT enabled`, updatedAt: new Date() })
    .where(eq(featureFlags.key, key));
  revalidatePath("/devops-admin");
}

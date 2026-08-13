"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toastRedirectBack } from "@/lib/toast";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function resetVgLeaderPin(userId: number) {
  await requireDeveloper();
  await db
    .update(users)
    .set({ pinHash: null })
    .where(and(eq(users.id, userId), eq(users.role, "vg_leader")));
  revalidatePath("/manage-vg-leaders");
  await toastRedirectBack(
    "PIN cleared. The leader will be asked to set a new one next time they access the portal — their profile is unaffected."
  );
}

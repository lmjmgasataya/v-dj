"use server";

import { db } from "@/db";
import { checkIns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function deleteCheckIn(formData: FormData) {
  await requireDeveloper();
  await db.delete(checkIns).where(eq(checkIns.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/check-ins");
}

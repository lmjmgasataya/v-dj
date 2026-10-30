"use server";

import { db } from "@/db";
import { interns } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { toTitleCase } from "@/lib/text";

/**
 * Renames an intern in place. Developer-only: lead pastors can open the interns list (proxy.ts)
 * but it's read-only for them. Updating the row keeps its id, so the intern's event
 * registrations and check-ins stay linked.
 */
export async function updateIntern(formData: FormData): Promise<{ error?: string }> {
  const session = await getSession();
  if (session?.role !== "developer") return { error: "Only developers can edit interns." };

  const id = Number(formData.get("id"));
  const lastName = toTitleCase(((formData.get("lastName") as string) || "").trim());
  const firstName = toTitleCase(((formData.get("firstName") as string) || "").trim());
  if (!id || !lastName || !firstName) return { error: "Last name and first name are required." };

  const updated = await db
    .update(interns)
    .set({ lastName, firstName })
    .where(and(eq(interns.id, id), isNull(interns.deletedAt)))
    .returning({ id: interns.id });
  if (updated.length === 0) return { error: "Intern not found." };

  revalidatePath("/vg-leader-portal/interns");
  return {};
}

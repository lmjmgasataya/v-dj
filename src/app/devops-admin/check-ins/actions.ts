"use server";

import { db } from "@/db";
import { checkIns, participants } from "@/db/schema";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
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

export async function searchParticipants(q: string) {
  await requireDeveloper();
  if (!q.trim()) return [];
  return db
    .select({
      id: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      mobileNumber: participants.mobileNumber,
    })
    .from(participants)
    .where(
      and(
        isNull(participants.deletedAt),
        or(
          ilike(participants.lastName, `%${q}%`),
          ilike(participants.firstName, `%${q}%`),
          ilike(participants.mobileNumber, `%${q}%`)
        )
      )
    )
    .orderBy(participants.lastName)
    .limit(10);
}

export async function createCheckIn(formData: FormData) {
  await requireDeveloper();
  const participantId = Number(formData.get("participantId"));
  const classSessionId = Number(formData.get("classSessionId"));
  if (!participantId || !classSessionId) return;
  const remarks = (formData.get("remarks") as string) || null;
  await db.insert(checkIns).values({ participantId, classSessionId, remarks }).onConflictDoNothing();
  revalidatePath("/devops-admin/check-ins");
}

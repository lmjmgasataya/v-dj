"use server";

import { db } from "@/db";
import { l113SpiritualDisciplines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireL113Admin } from "@/lib/l113Data";
import { STUDENT_SPIRITUAL_DISCIPLINES_PATH } from "@/lib/l113";
import { toastRedirectBack } from "@/lib/toast";

/** Removes a student's submitted month (e.g. a wrong entry); they can submit it again. */
export async function deleteL113SpiritualDiscipline(formData: FormData) {
  await requireL113Admin();
  await db.delete(l113SpiritualDisciplines).where(eq(l113SpiritualDisciplines.id, Number(formData.get("id"))));
  revalidatePath("/l113-portal/spiritual-disciplines");
  revalidatePath(STUDENT_SPIRITUAL_DISCIPLINES_PATH);
  await toastRedirectBack("Entry removed.");
}

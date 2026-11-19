"use server";

import { db } from "@/db";
import { l113StudentEvaluations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireL113Admin } from "@/lib/l113Data";
import { STUDENT_EVALUATION_FORM_PATH } from "@/lib/l113";
import { toastRedirectBack } from "@/lib/toast";

/** Removes a student's submitted score (e.g. a wrong entry); they can submit again. */
export async function deleteL113StudentEvaluation(formData: FormData) {
  await requireL113Admin();
  await db.delete(l113StudentEvaluations).where(eq(l113StudentEvaluations.id, Number(formData.get("id"))));
  revalidatePath("/l113-portal/student-evaluation");
  revalidatePath(STUDENT_EVALUATION_FORM_PATH);
  await toastRedirectBack("Score removed.");
}

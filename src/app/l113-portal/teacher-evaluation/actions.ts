"use server";

import { db } from "@/db";
import { l113TeacherEvaluations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireL113Admin } from "@/lib/l113Data";
import { STUDENT_TEACHER_EVALUATION_PATH } from "@/lib/l113";
import { toastRedirectBack } from "@/lib/toast";

/** Removes a student's submitted evaluation (e.g. a wrong entry); they can submit again. */
export async function deleteL113TeacherEvaluation(formData: FormData) {
  await requireL113Admin();
  await db.delete(l113TeacherEvaluations).where(eq(l113TeacherEvaluations.id, Number(formData.get("id"))));
  revalidatePath("/l113-portal/teacher-evaluation");
  revalidatePath(STUDENT_TEACHER_EVALUATION_PATH);
  await toastRedirectBack("Evaluation removed.");
}

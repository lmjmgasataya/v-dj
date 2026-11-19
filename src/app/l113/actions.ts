"use server";

import { db } from "@/db";
import { l113Batches, l113Schedules, l113SpiritualDisciplines, l113TeacherEvaluations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isBatchStudent } from "@/lib/l113Data";
import {
  batchMonths,
  formatMonth,
  parseL113StudentKey,
  RATING_SCALE,
  SPIRITUAL_DISCIPLINE_QUESTIONS,
  STUDENT_SPIRITUAL_DISCIPLINES_PATH,
  STUDENT_TEACHER_EVALUATION_PATH,
  TEACHER_EVAL_QUESTIONS,
  TEACHER_EVAL_TEXT_QUESTIONS,
} from "@/lib/l113";
import { toastRedirect, toastRedirectBack } from "@/lib/toast";

// Public forms (no login): the student picks their own name, so every action checks that
// the picked batch/student pair is real before saving.

async function readStudent(formData: FormData) {
  const student = parseL113StudentKey(String(formData.get("student") ?? ""));
  if (!student || !(await isBatchStudent(student.batchId, student.vgLeaderId))) return null;
  return student;
}

export async function saveSpiritualDisciplines(formData: FormData) {
  const student = await readStudent(formData);
  if (!student) return toastRedirectBack("Select your name from the list.", "error");
  const [batch] = await db.select().from(l113Batches).where(eq(l113Batches.id, student.batchId)).limit(1);

  const month = String(formData.get("month") ?? "");
  if (!batch || !batchMonths(batch.startDate, batch.endDate).includes(month)) {
    return toastRedirectBack("Select a month of your batch.", "error");
  }

  const values = {} as Record<(typeof SPIRITUAL_DISCIPLINE_QUESTIONS)[number]["key"], number>;
  for (const q of SPIRITUAL_DISCIPLINE_QUESTIONS) {
    const raw = String(formData.get(q.key) ?? "").trim();
    const n = Number(raw);
    if (raw === "" || !Number.isInteger(n) || n < 0 || n > 100000) {
      return toastRedirectBack("Answer every question with a whole number (0 or more).", "error");
    }
    values[q.key] = n;
  }
  if (values.daysReadFourChapters > 31) return toastRedirectBack("A month has at most 31 days.", "error");

  await db
    .insert(l113SpiritualDisciplines)
    .values({ batchId: student.batchId, vgLeaderId: student.vgLeaderId, month, ...values })
    .onConflictDoUpdate({
      target: [l113SpiritualDisciplines.batchId, l113SpiritualDisciplines.vgLeaderId, l113SpiritualDisciplines.month],
      set: { ...values, updatedAt: new Date() },
    });
  revalidatePath("/l113-portal/spiritual-disciplines");
  revalidatePath(STUDENT_SPIRITUAL_DISCIPLINES_PATH);
  toastRedirect(STUDENT_SPIRITUAL_DISCIPLINES_PATH, `Your ${formatMonth(month)} answers were saved. Thank you!`);
}

export async function saveTeacherEvaluation(formData: FormData) {
  const student = await readStudent(formData);
  if (!student) return toastRedirectBack("Select your name from the list.", "error");

  const scheduleId = Number(formData.get("scheduleId"));
  const [row] = await db
    .select({ teacherId: l113Schedules.teacherId })
    .from(l113Schedules)
    .where(and(eq(l113Schedules.id, scheduleId), eq(l113Schedules.batchId, student.batchId), eq(l113Schedules.isBreak, false)))
    .limit(1);
  const teacherId = row?.teacherId;
  if (!teacherId) return toastRedirectBack("Select a topic of your batch.", "error");

  const ratings = {} as Record<(typeof TEACHER_EVAL_QUESTIONS)[number]["key"], number>;
  for (const q of TEACHER_EVAL_QUESTIONS) {
    const n = Number(formData.get(q.key));
    if (!(RATING_SCALE as readonly number[]).includes(n)) return toastRedirectBack("Give a rating for every statement.", "error");
    ratings[q.key] = n;
  }
  const answers = {} as Record<(typeof TEACHER_EVAL_TEXT_QUESTIONS)[number]["key"], string>;
  for (const q of TEACHER_EVAL_TEXT_QUESTIONS) {
    const text = String(formData.get(q.key) ?? "").trim().slice(0, 2000);
    if (!text) return toastRedirectBack("Answer both questions about the teacher/facilitator.", "error");
    answers[q.key] = text;
  }

  await db
    .insert(l113TeacherEvaluations)
    .values({ scheduleId, vgLeaderId: student.vgLeaderId, teacherId, ...ratings, ...answers })
    .onConflictDoUpdate({
      target: [l113TeacherEvaluations.scheduleId, l113TeacherEvaluations.vgLeaderId],
      set: { teacherId, ...ratings, ...answers, updatedAt: new Date() },
    });
  revalidatePath("/l113-portal/teacher-evaluation");
  revalidatePath(STUDENT_TEACHER_EVALUATION_PATH);
  toastRedirect(STUDENT_TEACHER_EVALUATION_PATH, "Your evaluation was submitted. Thank you!");
}


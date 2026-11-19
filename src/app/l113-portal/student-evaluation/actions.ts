"use server";

import { db } from "@/db";
import { l113BatchStudents, l113Schedules, l113StudentEvaluations } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireL113Admin } from "@/lib/l113Data";
import { toastRedirectBack } from "@/lib/toast";

/**
 * Saves a topic's scores: `score_<vgLeaderId>` per student, one highest possible score for the
 * topic. A blank score removes that student's evaluation.
 */
export async function saveL113StudentScores(formData: FormData) {
  await requireL113Admin();
  const scheduleId = Number(formData.get("scheduleId"));
  const highest = Number(formData.get("highestPossibleScore"));
  if (!Number.isFinite(highest) || highest <= 0) return toastRedirectBack("Enter a highest possible score above 0.", "error");

  const [schedule] = await db
    .select({ batchId: l113Schedules.batchId })
    .from(l113Schedules)
    .where(and(eq(l113Schedules.id, scheduleId), eq(l113Schedules.isBreak, false)))
    .limit(1);
  if (!schedule) return toastRedirectBack("That topic no longer exists.", "error");
  const studentIds = (
    await db.select({ id: l113BatchStudents.vgLeaderId }).from(l113BatchStudents).where(eq(l113BatchStudents.batchId, schedule.batchId))
  ).map((r) => r.id);

  const scores: { vgLeaderId: number; score: number }[] = [];
  const cleared: number[] = [];
  for (const vgLeaderId of studentIds) {
    const raw = String(formData.get(`score_${vgLeaderId}`) ?? "").trim();
    if (raw === "") {
      cleared.push(vgLeaderId);
      continue;
    }
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > highest) {
      return toastRedirectBack(`Scores must be between 0 and ${highest}.`, "error");
    }
    scores.push({ vgLeaderId, score });
  }

  await db.transaction(async (tx) => {
    if (cleared.length) {
      await tx
        .delete(l113StudentEvaluations)
        .where(and(eq(l113StudentEvaluations.scheduleId, scheduleId), inArray(l113StudentEvaluations.vgLeaderId, cleared)));
    }
    for (const s of scores) {
      await tx
        .insert(l113StudentEvaluations)
        .values({ scheduleId, vgLeaderId: s.vgLeaderId, score: s.score, highestPossibleScore: highest })
        .onConflictDoUpdate({
          target: [l113StudentEvaluations.scheduleId, l113StudentEvaluations.vgLeaderId],
          set: { score: s.score, highestPossibleScore: highest, updatedAt: new Date() },
        });
    }
  });
  revalidatePath("/l113-portal/student-evaluation");
  await toastRedirectBack(`Saved ${scores.length} score${scores.length === 1 ? "" : "s"}.`);
}

import { db } from "@/db";
import { l113StudentEvaluations } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getL113FormStudents, getL113FormTopics } from "@/lib/l113Data";
import { l113StudentKey } from "@/lib/l113";
import { FormHeader, FormNotice } from "../ui";
import { StudentEvaluationForm } from "./StudentEvaluationForm";

export const metadata = { title: "Student Evaluation · Leadership 113" };

/** Public form (one link for every student). Scores are never shown back, only which topics are done. */
export default async function StudentEvaluationFormPage() {
  const [{ batches, students }, session] = await Promise.all([getL113FormStudents(), getSession()]);
  const { topicsByBatch, batchOfTopic } = await getL113FormTopics(batches);

  const topicIds = [...batchOfTopic.keys()];
  const doneRows = topicIds.length
    ? await db
        .select({ scheduleId: l113StudentEvaluations.scheduleId, vgLeaderId: l113StudentEvaluations.vgLeaderId })
        .from(l113StudentEvaluations)
        .where(inArray(l113StudentEvaluations.scheduleId, topicIds))
    : [];
  const submitted: Record<string, number[]> = {};
  for (const r of doneRows) (submitted[l113StudentKey(batchOfTopic.get(r.scheduleId)!, r.vgLeaderId)] ??= []).push(r.scheduleId);

  const ownKey = session?.role === "vg_leader" ? students.find((s) => s.vgLeaderId === session.vgLeaderId)?.key : undefined;

  return (
    <div className="flex flex-col gap-5">
      <FormHeader
        title="Student Evaluation"
        description="Select your name and the topic, then enter your score/rating and the highest possible score/rating."
      />
      {students.length === 0 ? (
        <FormNotice>There are no Leadership 113 students yet.</FormNotice>
      ) : (
        <StudentEvaluationForm
          batches={batches.map((b) => ({ id: b.id, name: b.name }))}
          students={students}
          topicsByBatch={topicsByBatch}
          submitted={submitted}
          initialStudent={ownKey ?? ""}
        />
      )}
    </div>
  );
}

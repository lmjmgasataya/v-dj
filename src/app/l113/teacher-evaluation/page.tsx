import { db } from "@/db";
import { l113TeacherEvaluations } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getL113FormStudents, getL113FormTopics } from "@/lib/l113Data";
import { l113StudentKey } from "@/lib/l113";
import { FormHeader, FormNotice } from "../ui";
import { TeacherEvaluationForm } from "./TeacherEvaluationForm";

export const metadata = { title: "Teacher Evaluation · Leadership 113" };

/** Public form (one link for every student). Ratings are never shown back, only which topics are done. */
export default async function TeacherEvaluationFormPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic: topicParam } = await searchParams;
  const [{ batches, students }, session] = await Promise.all([getL113FormStudents(), getSession()]);
  const { topicsByBatch, batchOfTopic } = await getL113FormTopics(batches);

  const topicIds = [...batchOfTopic.keys()];
  const doneRows = topicIds.length
    ? await db
        .select({ scheduleId: l113TeacherEvaluations.scheduleId, vgLeaderId: l113TeacherEvaluations.vgLeaderId })
        .from(l113TeacherEvaluations)
        .where(inArray(l113TeacherEvaluations.scheduleId, topicIds))
    : [];
  const evaluated: Record<string, number[]> = {};
  for (const r of doneRows) (evaluated[l113StudentKey(batchOfTopic.get(r.scheduleId)!, r.vgLeaderId)] ??= []).push(r.scheduleId);

  const ownKey = session?.role === "vg_leader" ? students.find((s) => s.vgLeaderId === session.vgLeaderId)?.key : undefined;

  return (
    <div className="flex flex-col gap-5">
      <FormHeader
        title="Teacher Evaluation"
        description="Select your name and the topic, then rate the teacher/facilitator. Your answers help our teachers keep improving."
      />
      {students.length === 0 ? (
        <FormNotice>There are no Leadership 113 students yet.</FormNotice>
      ) : (
        <TeacherEvaluationForm
          batches={batches.map((b) => ({ id: b.id, name: b.name }))}
          students={students}
          topicsByBatch={topicsByBatch}
          evaluated={evaluated}
          initialStudent={ownKey ?? ""}
          initialTopic={topicParam ?? ""}
        />
      )}
    </div>
  );
}

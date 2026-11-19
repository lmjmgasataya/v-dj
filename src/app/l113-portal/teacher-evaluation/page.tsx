import Link from "next/link";
import { db } from "@/db";
import { l113TeacherEvaluations, l113Teachers, victoryGroupLeaders } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { getBatchSchedule, getBatchStudents, getL113Batches, pickBatch } from "@/lib/l113Data";
import { STUDENT_TEACHER_EVALUATION_PATH, TEACHER_EVAL_FEEDBACK_QUESTION, TEACHER_EVAL_QUESTIONS } from "@/lib/l113";
import { BatchPicker } from "@/components/BatchPicker";
import { ConfirmDeleteButton } from "@/app/sessions/batches/ConfirmDeleteButton";
import { Card, CardHeader, L113Header, NoBatches } from "../ui";
import { CopyLinkButton } from "../CopyLinkButton";
import { ParamSelect } from "../ParamSelect";
import { deleteL113TeacherEvaluation } from "./actions";

function avg(values: number[]) {
  return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : "—";
}

export default async function L113TeacherEvaluationPage({ searchParams }: { searchParams: Promise<{ batch?: string; topic?: string }> }) {
  const { batch: batchParam, topic: topicParam } = await searchParams;
  const batches = await getL113Batches();
  const batch = pickBatch(batches, batchParam);

  if (!batch) {
    return (
      <>
        <L113Header title="Teacher Evaluation" />
        <NoBatches />
      </>
    );
  }

  const [schedule, students] = await Promise.all([getBatchSchedule(batch.id), getBatchStudents(batch.id)]);
  const evaluations = schedule.length
    ? await db
        .select({
          evaluation: l113TeacherEvaluations,
          lastName: victoryGroupLeaders.lastName,
          firstName: victoryGroupLeaders.firstName,
          ratedTeacher: l113Teachers.name,
        })
        .from(l113TeacherEvaluations)
        .innerJoin(victoryGroupLeaders, eq(victoryGroupLeaders.id, l113TeacherEvaluations.vgLeaderId))
        .innerJoin(l113Teachers, eq(l113Teachers.id, l113TeacherEvaluations.teacherId))
        .where(inArray(l113TeacherEvaluations.scheduleId, schedule.map((s) => s.id)))
        .orderBy(asc(victoryGroupLeaders.lastName), asc(victoryGroupLeaders.firstName))
    : [];
  const topic = schedule.find((s) => String(s.id) === topicParam) ?? schedule[0];
  const topicEvals = topic ? evaluations.filter((e) => e.evaluation.scheduleId === topic.id) : [];

  return (
    <>
      <L113Header title="Teacher Evaluation" description="Students rate each topic's teacher/facilitator through one shared link: they pick their name, the topic, then answer." />
      <BatchPicker batches={batches} selectedId={batch.id} />

      {!topic ? (
        <Card>
          <p className="px-6 py-8 text-sm text-gray-500 text-center">
            {batch.name} has no schedule yet.{" "}
            <Link href={`/l113-portal/schedule?batch=${batch.id}`} className="text-indigo-600 font-medium hover:underline">
              Add topics
            </Link>{" "}
            first.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Summary" subtitle="Average rating per question, 1 (strongly disagree) to 5 (strongly agree).">
              <CopyLinkButton path={STUDENT_TEACHER_EVALUATION_PATH} label="Copy student link" />
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Topic</th>
                    <th className="px-4 py-2 text-left font-medium">Teacher/Facilitator</th>
                    <th className="px-3 py-2 text-center font-medium">Prepared</th>
                    <th className="px-3 py-2 text-center font-medium">Clear</th>
                    <th className="px-3 py-2 text-center font-medium">Responsive</th>
                    <th className="px-3 py-2 text-center font-medium">Responses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schedule.map((s) => {
                    const rows = evaluations.filter((e) => e.evaluation.scheduleId === s.id).map((e) => e.evaluation);
                    return (
                      <tr key={s.id} className={s.id === topic.id ? "bg-indigo-50/50" : "hover:bg-gray-50"}>
                        <td className="px-4 py-2.5">
                          <Link href={`/l113-portal/teacher-evaluation?batch=${batch.id}&topic=${s.id}`} className="font-medium text-indigo-700 hover:underline">
                            {s.topic}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{s.teacher}</td>
                        {TEACHER_EVAL_QUESTIONS.map((q) => (
                          <td key={q.key} className="px-3 py-2.5 text-center text-gray-700">
                            {avg(rows.map((r) => r[q.key]))}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center text-gray-500">
                          {rows.length}/{students.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <ParamSelect
            label="Topic"
            hrefPrefix={`/l113-portal/teacher-evaluation?batch=${batch.id}&topic=`}
            value={String(topic.id)}
            options={schedule.map((s) => ({ value: String(s.id), label: `${s.topic} · ${s.teacher}` }))}
          />

          <Card>
            <CardHeader title={`${topic.topic} — ${topic.teacher}`} subtitle={`${topicEvals.length} of ${students.length} students responded`} />
            {topicEvals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium uppercase tracking-wide">Name of Student</th>
                      {TEACHER_EVAL_QUESTIONS.map((q) => (
                        <th key={q.key} className="px-3 py-2 text-center font-medium max-w-48">
                          {q.label}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-left font-medium min-w-64">{TEACHER_EVAL_FEEDBACK_QUESTION}</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topicEvals.map(({ evaluation: e, lastName, firstName, ratedTeacher }) => (
                      <tr key={e.id} className="align-top">
                        <td className="px-4 py-2.5 text-gray-800 whitespace-nowrap">
                          {lastName}, {firstName}
                          {e.teacherId !== topic.teacherId && <p className="text-xs text-gray-400">Rated {ratedTeacher}</p>}
                        </td>
                        {TEACHER_EVAL_QUESTIONS.map((q) => (
                          <td key={q.key} className="px-3 py-2.5 text-center text-gray-700">
                            {e[q.key]}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-gray-600 whitespace-pre-line">{e.feedback || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-right">
                          <ConfirmDeleteButton
                            action={deleteL113TeacherEvaluation}
                            hiddenFields={{ id: String(e.id) }}
                            message={`Remove ${firstName} ${lastName}'s evaluation for "${topic.topic}"? They can submit again.`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No responses yet. Share the student link with the batch.</p>
            )}
          </Card>
        </>
      )}
    </>
  );
}

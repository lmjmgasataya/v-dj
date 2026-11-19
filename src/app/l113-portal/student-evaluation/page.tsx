import Link from "next/link";
import { db } from "@/db";
import { l113StudentEvaluations } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getBatchSchedule, getBatchStudents, getL113Batches, pickBatch } from "@/lib/l113Data";
import { formatL113Date, STUDENT_EVALUATION_FORM_PATH } from "@/lib/l113";
import { TZ } from "@/lib/date";
import { BatchPicker } from "@/components/BatchPicker";
import { ConfirmDeleteButton } from "@/app/sessions/batches/ConfirmDeleteButton";
import { Card, CardHeader, L113Header, NoBatches } from "../ui";
import { CopyLinkButton } from "../CopyLinkButton";
import { ParamSelect } from "../ParamSelect";
import { deleteL113StudentEvaluation } from "./actions";

function pct(score: number, highest: number) {
  return `${Math.round((score / highest) * 100)}%`;
}

export default async function L113StudentEvaluationPage({ searchParams }: { searchParams: Promise<{ batch?: string; topic?: string }> }) {
  const { batch: batchParam, topic: topicParam } = await searchParams;
  const batches = await getL113Batches();
  const batch = pickBatch(batches, batchParam);

  if (!batch) {
    return (
      <>
        <L113Header title="Student Evaluation" />
        <NoBatches />
      </>
    );
  }

  const [schedule, students] = await Promise.all([getBatchSchedule(batch.id), getBatchStudents(batch.id)]);
  const evaluations = schedule.length
    ? await db.select().from(l113StudentEvaluations).where(inArray(l113StudentEvaluations.scheduleId, schedule.map((s) => s.id)))
    : [];
  const topic = schedule.find((s) => String(s.id) === topicParam) ?? schedule[0];
  const evalOf = (scheduleId: number, vgLeaderId: number) => evaluations.find((e) => e.scheduleId === scheduleId && e.vgLeaderId === vgLeaderId);
  const topicEvals = topic ? evaluations.filter((e) => e.scheduleId === topic.id) : [];

  return (
    <>
      <L113Header
        title="Student Evaluation"
        description="Students submit their score/rating through one shared link: they pick their name, the topic, then enter their score and the highest possible score."
      />
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
      ) : students.length === 0 ? (
        <Card>
          <p className="px-6 py-8 text-sm text-gray-500 text-center">{batch.name} has no students yet.</p>
        </Card>
      ) : (
        <>
          <ParamSelect
            label="Topic"
            hrefPrefix={`/l113-portal/student-evaluation?batch=${batch.id}&topic=`}
            value={String(topic.id)}
            options={schedule.map((s) => ({ value: String(s.id), label: s.topic }))}
          />

          <Card>
            <CardHeader
              title={topic.topic}
              subtitle={`${topic.teacher} · ${topic.dates.map((d) => formatL113Date(d.classDate)).join(", ")} · ${topicEvals.length} of ${students.length} submitted`}
            >
              <CopyLinkButton path={STUDENT_EVALUATION_FORM_PATH} />
            </CardHeader>
            {topicEvals.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Name of Student</th>
                    <th className="px-4 py-2 text-right font-medium">Score/Rating</th>
                    <th className="px-4 py-2 text-right font-medium">Highest Possible</th>
                    <th className="px-4 py-2 text-right font-medium">%</th>
                    <th className="px-4 py-2 text-right font-medium">Submitted</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s) => {
                    const e = evalOf(topic.id, s.vgLeaderId);
                    if (!e) return null;
                    return (
                      <tr key={s.vgLeaderId}>
                        <td className="px-4 py-2 text-gray-800">{s.name}</td>
                        <td className="px-4 py-2 text-right text-gray-800">{e.score}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{e.highestPossibleScore}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800">{pct(e.score, e.highestPossibleScore)}</td>
                        <td className="px-4 py-2 text-right text-xs text-gray-500">{e.updatedAt.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ })}</td>
                        <td className="px-4 py-2 text-right">
                          <ConfirmDeleteButton
                            action={deleteL113StudentEvaluation}
                            hiddenFields={{ id: String(e.id) }}
                            message={`Remove ${s.name}'s score for "${topic.topic}"? They can submit again.`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No scores submitted for this topic yet.</p>
            )}
            {topicEvals.length < students.length && (
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Not yet submitted</p>
                <p className="text-sm text-gray-600">
                  {students
                    .filter((s) => !evalOf(topic.id, s.vgLeaderId))
                    .map((s) => s.name)
                    .join(" · ")}
                </p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="All Topics" subtitle="Score / highest possible score per topic, and each student's overall percentage." />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium uppercase tracking-wide">Name of Student</th>
                    {schedule.map((t) => (
                      <th key={t.id} className="px-3 py-2 text-center font-medium">
                        {t.topic}
                      </th>
                    ))}
                    <th className="px-4 py-2 text-center font-medium uppercase tracking-wide">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s) => {
                    const mine = evaluations.filter((e) => e.vgLeaderId === s.vgLeaderId);
                    const total = mine.reduce((sum, e) => sum + e.score, 0);
                    const max = mine.reduce((sum, e) => sum + e.highestPossibleScore, 0);
                    return (
                      <tr key={s.vgLeaderId}>
                        <td className="px-4 py-2 text-gray-800 whitespace-nowrap">{s.name}</td>
                        {schedule.map((t) => {
                          const e = evalOf(t.id, s.vgLeaderId);
                          return (
                            <td key={t.id} className="px-3 py-2 text-center text-gray-600 whitespace-nowrap">
                              {e ? `${e.score}/${e.highestPossibleScore}` : <span className="text-gray-300">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-4 py-2 text-center font-semibold text-gray-800">{max > 0 ? pct(total, max) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

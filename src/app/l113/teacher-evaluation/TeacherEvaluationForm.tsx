"use client";

import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { SubmitButton } from "@/components/SubmitButton";
import { RATING_LABEL, RATING_SCALE, TEACHER_EVAL_QUESTIONS, TEACHER_EVAL_TEXT_QUESTIONS } from "@/lib/l113";
import type { L113FormStudent } from "@/lib/l113Data";
import { saveTeacherEvaluation } from "../actions";
import { formCard } from "../ui";

type Topic = { id: number; topic: string; teacher: string };

interface Props {
  batches: { id: number; name: string }[];
  students: L113FormStudent[];
  topicsByBatch: Record<number, Topic[]>;
  /** Topic ids already evaluated, by student key. */
  evaluated: Record<string, number[]>;
  initialStudent: string;
  /** `?topic=` from the student's VG portal page; used when it's one of their topics. */
  initialTopic: string;
}

export function TeacherEvaluationForm({ batches, students, topicsByBatch, evaluated, initialStudent, initialTopic }: Props) {
  const [studentKey, setStudentKey] = useState(initialStudent);
  const [topicId, setTopicId] = useState(() => {
    const batchId = students.find((s) => s.key === initialStudent)?.batchId;
    return batchId && topicsByBatch[batchId]?.some((t) => String(t.id) === initialTopic) ? initialTopic : "";
  });
  const student = students.find((s) => s.key === studentKey);
  const topics = student ? (topicsByBatch[student.batchId] ?? []) : [];
  const topic = topics.find((t) => String(t.id) === topicId);
  const done = new Set(evaluated[studentKey] ?? []);

  return (
    <form action={saveTeacherEvaluation} className="max-w-2xl w-full mx-auto flex flex-col gap-5">
      <div className={formCard}>
        <label className="text-base font-semibold text-gray-800">
          Your name <span className="text-red-600">*</span>
        </label>
        <Combobox
          name="student"
          options={students.map((s) => ({
            value: s.key,
            label: s.label,
            hint: batches.length > 1 ? batches.find((b) => b.id === s.batchId)?.name : undefined,
          }))}
          value={studentKey}
          onChange={(key) => {
            setStudentKey(key);
            setTopicId("");
          }}
          placeholder="Type your name…"
          emptyText="No student by that name. Ask your L113 coordinator to add you to the batch."
        />
      </div>

      {student && (
        <div className={formCard}>
          <label htmlFor="l113-topic" className="text-base font-semibold text-gray-800">
            Topic <span className="text-red-600">*</span>
          </label>
          {topics.length === 0 ? (
            <p className="text-sm text-gray-500">No classes have been held yet. Come back after your first class.</p>
          ) : (
            <>
              <select
                id="l113-topic"
                name="scheduleId"
                required
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="" disabled>
                  Choose a topic
                </option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.topic}
                    {done.has(t.id) ? " ✓" : ""}
                  </option>
                ))}
              </select>
              {topic && (
                <p className="text-sm text-gray-600">
                  Teacher/Facilitator: <span className="font-semibold text-gray-900">{topic.teacher}</span>
                </p>
              )}
            </>
          )}
        </div>
      )}

      {topic && (
        // Remount per student and topic so the answers start empty for each.
        <div key={`${studentKey}|${topic.id}`} className={`${formCard} gap-6`}>
          {done.has(topic.id) && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              You already evaluated this topic. Submitting again replaces your earlier answers.
            </p>
          )}
          {TEACHER_EVAL_QUESTIONS.map((q) => (
            <fieldset key={q.key} className="flex flex-col gap-2">
              <legend className="text-sm text-gray-800 mb-2">
                {q.label} <span className="text-red-600">*</span>
              </legend>
              <div className="grid grid-cols-5 gap-2">
                {RATING_SCALE.map((n) => (
                  <label key={n} className="flex flex-col items-center gap-1 cursor-pointer text-center">
                    <input type="radio" name={q.key} value={n} required className="peer sr-only" />
                    <span className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-700 peer-checked:bg-[#00428E] peer-checked:border-[#00428E] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400">
                      {n}
                    </span>
                    <span className="text-[11px] leading-tight text-gray-500">{RATING_LABEL[n]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {TEACHER_EVAL_TEXT_QUESTIONS.map((q) => (
            <label key={q.key} className="flex flex-col gap-1.5">
              <span className="text-sm text-gray-800">
                {q.label} <span className="text-red-600">*</span>
              </span>
              <textarea
                name={q.key}
                required
                rows={3}
                maxLength={2000}
                className="rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </label>
          ))}
          <SubmitButton
            label="Submit"
            pendingLabel="Submitting…"
            className="w-fit px-5 py-2.5 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
          />
        </div>
      )}
    </form>
  );
}

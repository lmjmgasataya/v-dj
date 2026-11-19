"use client";

import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { SubmitButton } from "@/components/SubmitButton";
import type { L113FormStudent, L113FormTopic } from "@/lib/l113Data";
import { saveStudentEvaluation } from "../actions";
import { formCard } from "../ui";

interface Props {
  batches: { id: number; name: string }[];
  students: L113FormStudent[];
  topicsByBatch: Record<number, L113FormTopic[]>;
  /** Topic ids already submitted, by student key. */
  submitted: Record<string, number[]>;
  initialStudent: string;
}

const numberInput =
  "w-40 rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400";

export function StudentEvaluationForm({ batches, students, topicsByBatch, submitted, initialStudent }: Props) {
  const [studentKey, setStudentKey] = useState(initialStudent);
  const [topicId, setTopicId] = useState("");
  const [highest, setHighest] = useState("");
  const student = students.find((s) => s.key === studentKey);
  const topics = student ? (topicsByBatch[student.batchId] ?? []) : [];
  const topic = topics.find((t) => String(t.id) === topicId);
  const done = new Set(submitted[studentKey] ?? []);
  const highestNum = Number(highest);

  return (
    <form action={saveStudentEvaluation} className="max-w-2xl w-full mx-auto flex flex-col gap-5">
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
            setHighest("");
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
            <select
              id="l113-topic"
              name="scheduleId"
              required
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value);
                setHighest("");
              }}
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
          )}
        </div>
      )}

      {topic && (
        // Remount per student and topic so the fields start empty for each.
        <div key={`${studentKey}|${topic.id}`} className={`${formCard} gap-5`}>
          {done.has(topic.id) && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              You already submitted a score for this topic. Submitting again replaces it.
            </p>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-800">
              Score/Rating <span className="text-red-600">*</span>
            </span>
            <input
              type="number"
              name="score"
              required
              min={0}
              max={highestNum > 0 ? highestNum : undefined}
              step="any"
              inputMode="decimal"
              className={numberInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-800">
              Highest Possible Score/Rating <span className="text-red-600">*</span>
            </span>
            <input
              type="number"
              name="highestPossibleScore"
              required
              min="0.01"
              step="any"
              inputMode="decimal"
              value={highest}
              onChange={(e) => setHighest(e.target.value)}
              className={numberInput}
            />
          </label>
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

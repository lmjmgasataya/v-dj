"use client";

import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { SubmitButton } from "@/components/SubmitButton";
import { formatMonth, SPIRITUAL_DISCIPLINE_QUESTIONS } from "@/lib/l113";
import type { L113FormStudent } from "@/lib/l113Data";
import { saveSpiritualDisciplines } from "../actions";
import { formCard } from "../ui";

interface Props {
  batches: { id: number; name: string; months: string[]; defaultMonth: string }[];
  students: L113FormStudent[];
  /** Months already submitted, by student key. */
  submitted: Record<string, string[]>;
  initialStudent: string;
}

export function SpiritualDisciplinesForm({ batches, students, submitted, initialStudent }: Props) {
  const [studentKey, setStudentKey] = useState(initialStudent);
  const student = students.find((s) => s.key === studentKey);
  const batch = student ? batches.find((b) => b.id === student.batchId) : undefined;
  const [month, setMonth] = useState(batch?.defaultMonth ?? "");
  const done = new Set(submitted[studentKey] ?? []);

  return (
    <form action={saveSpiritualDisciplines} className="max-w-2xl w-full mx-auto flex flex-col gap-5">
      <input type="hidden" name="month" value={month} />

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
            const b = batches.find((x) => x.id === students.find((s) => s.key === key)?.batchId);
            setMonth(b?.defaultMonth ?? "");
          }}
          placeholder="Type your name…"
          emptyText="No student by that name. Ask your L113 coordinator to add you to the batch."
        />
      </div>

      {student && batch && (
        <>
          <div className={formCard}>
            <p className="text-base font-semibold text-gray-800">
              Month <span className="text-red-600">*</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {batch.months.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonth(m)}
                  aria-pressed={m === month}
                  className={`rounded-lg border px-3 py-2 text-sm text-left transition ${
                    m === month ? "border-indigo-500 bg-indigo-50 text-indigo-800 font-semibold" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {formatMonth(m)}
                  <span className={`block text-xs font-normal ${done.has(m) ? "text-green-600" : "text-gray-400"}`}>
                    {done.has(m) ? "✓ Submitted" : "Not yet"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Remount per student and month so the fields start empty for each. */}
          <div key={`${studentKey}|${month}`} className={`${formCard} gap-5`}>
            <p className="text-base font-semibold text-gray-800">{formatMonth(month)}</p>
            {done.has(month) && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                You already submitted {formatMonth(month)}. Submitting again replaces your earlier answers.
              </p>
            )}
            {SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => (
              <label key={q.key} className="flex flex-col gap-1.5">
                <span className="text-sm text-gray-800">
                  {q.label} <span className="text-red-600">*</span>
                </span>
                <input
                  type="number"
                  name={q.key}
                  required
                  min={0}
                  max={q.key === "daysReadFourChapters" ? 31 : undefined}
                  step={1}
                  inputMode="numeric"
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </label>
            ))}
            <SubmitButton
              label="Submit"
              pendingLabel="Submitting…"
              className="w-fit px-5 py-2.5 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
            />
          </div>
        </>
      )}
    </form>
  );
}

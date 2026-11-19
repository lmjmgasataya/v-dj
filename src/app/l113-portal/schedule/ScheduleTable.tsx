"use client";

import Link from "next/link";
import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { Combobox, SuggestInput } from "@/components/Combobox";
import { ConfirmDeleteButton } from "@/app/sessions/batches/ConfirmDeleteButton";
import { formatScheduleDates } from "@/lib/l113";
import { createL113Schedule, deleteL113Schedule, updateL113Schedule } from "./actions";

export interface ScheduleRow {
  id: number;
  topic: string;
  teacherId: number | null;
  teacher: string;
  isBreak: boolean;
  remarks: string | null;
  semester: number | null;
  dates: string[];
}

const input =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400";
const th = "px-3 py-2.5 text-left font-semibold text-gray-700";
const td = "px-3 py-2.5 align-top";

/**
 * The batch's schedule laid out like the printed L113 calendar. Each row edits in place, and
 * the last row adds a new entry.
 */
export function ScheduleTable({
  batchId,
  rows,
  topics,
  teachers,
}: {
  batchId: number;
  rows: ScheduleRow[];
  topics: string[];
  teachers: { id: number; name: string }[];
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const classes = rows.filter((r) => !r.isBreak);
  const totalWeeks = classes.reduce((n, r) => n + r.dates.length, 0);
  const semesterWeeks = (sem: number) => classes.filter((r) => r.semester === sem).reduce((n, r) => n + r.dates.length, 0);
  // A "SEMESTER n" heading goes above the first class row of each semester.
  const headingBefore = new Map<number, number>();
  let lastSemester: number | null = null;
  for (const r of rows) {
    if (r.isBreak || r.semester == null || r.semester === lastSemester) continue;
    headingBefore.set(r.id, r.semester);
    lastSemester = r.semester;
  }
  // New entries start in the semester of the last class so far.
  const nextSemester = classes.findLast((r) => r.semester != null)?.semester ?? 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead className="border-b-2 border-gray-300">
          <tr>
            <th className={th}>Topic</th>
            <th className={`${th} text-center w-20`}>Weeks</th>
            <th className={th}>Dates</th>
            <th className={th}>Teacher/ Facilitator</th>
            <th className={th}>Remarks</th>
            <th className="px-3 py-2.5 w-28" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => [
            headingBefore.has(r.id) && (
              <tr key={`sem-${r.id}`} className="bg-[#00428E]/5 border-b border-gray-200">
                <td colSpan={6} className="px-3 py-2 text-xs font-bold tracking-wide text-[#00428E]">
                  SEMESTER {headingBefore.get(r.id)}
                  <span className="ml-2 font-medium text-gray-500">
                    · {semesterWeeks(headingBefore.get(r.id)!)} week{semesterWeeks(headingBefore.get(r.id)!) === 1 ? "" : "s"}
                  </span>
                </td>
              </tr>
            ),
            editingId === r.id ? (
              <tr key={r.id} className="bg-indigo-50/60">
                <td colSpan={6} className="px-3 py-3">
                  <RowForm
                    action={updateL113Schedule}
                    hidden={{ id: String(r.id) }}
                    initial={r}
                    topics={topics}
                    teachers={teachers}
                    defaultSemester={r.semester ?? nextSemester}
                    submitLabel="Save"
                    onCancel={() => setEditingId(null)}
                  />
                </td>
              </tr>
            ) : (
              <tr key={r.id} className={`border-b border-dashed border-gray-200 ${i % 2 ? "bg-gray-50/70" : ""}`}>
                <td className={`${td} ${r.isBreak ? "font-bold text-gray-900" : "text-gray-800"}`}>{r.topic}</td>
                <td className={`${td} text-center text-gray-700`}>{r.isBreak ? "" : r.dates.length}</td>
                <td className={`${td} text-gray-700`}>{formatScheduleDates(r.dates)}</td>
                <td className={`${td} text-gray-700`}>{r.teacher}</td>
                <td className={`${td} text-gray-600`}>{r.remarks}</td>
                <td className={td}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(r.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                    <ConfirmDeleteButton
                      action={deleteL113Schedule}
                      hiddenFields={{ id: String(r.id) }}
                      message={`Delete "${r.topic}"? Its check-ins and evaluations are deleted too.`}
                    />
                  </div>
                </td>
              </tr>
            ),
          ])}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                No topics scheduled yet. Add the first one below.
              </td>
            </tr>
          )}
          <tr className="border-y-2 border-gray-300">
            <td className="px-3 py-2.5 font-bold text-gray-900">TOTAL NUMBER OF WEEKS</td>
            <td className="px-3 py-2.5 text-center font-bold text-gray-900">{totalWeeks}</td>
            <td colSpan={4} />
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td colSpan={6} className="px-3 py-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Add Entry</p>
              <RowForm
                action={createL113Schedule}
                hidden={{ batchId: String(batchId) }}
                topics={topics}
                teachers={teachers}
                defaultSemester={nextSemester}
                submitLabel="Add"
              />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function RowForm({
  action,
  hidden,
  initial,
  topics,
  teachers,
  defaultSemester,
  submitLabel,
  onCancel,
}: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  initial?: ScheduleRow;
  topics: string[];
  teachers: { id: number; name: string }[];
  defaultSemester: number;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [teacherId, setTeacherId] = useState(initial?.teacherId ? String(initial.teacherId) : "");
  const [isBreak, setIsBreak] = useState(initial?.isBreak ?? false);
  const [dates, setDates] = useState<string[]>(initial?.dates.length ? initial.dates : [""]);
  const [teacherMissing, setTeacherMissing] = useState(false);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!isBreak && !teacherId) {
          e.preventDefault();
          setTeacherMissing(true);
        }
      }}
      className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1.5fr_8rem] gap-3"
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Topic</label>
        <SuggestInput
          name="topic"
          required
          suggestions={topics}
          value={topic}
          onChange={setTopic}
          placeholder="Type or pick a topic"
          className={input}
        />
        <label className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" name="isBreak" checked={isBreak} onChange={(e) => setIsBreak(e.target.checked)} />
          Break, no class (e.g. SEM BREAK)
        </label>
      </div>
      <div>
        {!isBreak && (
          <>
            <div className="flex items-baseline justify-between mb-1">
              <label className="block text-xs text-gray-500">Teacher/ Facilitator</label>
              <Link href="/l113-portal/teachers" className="text-xs text-indigo-600 hover:text-indigo-800">
                Manage
              </Link>
            </div>
            <Combobox
              name="teacherId"
              options={teachers.map((t) => ({ value: String(t.id), label: t.name }))}
              value={teacherId}
              onChange={(v) => {
                setTeacherId(v);
                setTeacherMissing(false);
              }}
              placeholder={teachers.length ? "Type to search…" : "Add teachers first"}
              emptyText="No teacher by that name. Add them under Manage."
              className={input}
            />
            {teacherMissing && <p className="text-xs text-red-600 mt-1">Pick a teacher/facilitator from the list.</p>}
          </>
        )}
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Remarks</label>
        <input name="remarks" defaultValue={initial?.remarks ?? ""} placeholder="e.g. Feb 7 - Victory Weekend" maxLength={300} className={input} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Semester</label>
        <select
          name="semester"
          required={!isBreak}
          defaultValue={initial ? (initial.semester ?? "") : defaultSemester}
          className={input}
        >
          {isBreak && <option value="">None (between)</option>}
          <option value={1}>Semester 1</option>
          <option value={2}>Semester 2</option>
        </select>
      </div>
      <div className="md:col-span-4">
        <label className="block text-xs text-gray-500 mb-1">
          Dates <span className="text-gray-400">(one per week{isBreak ? "" : "; the count is the Weeks column"})</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {dates.map((d, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="date"
                name="classDate"
                required
                value={d}
                onChange={(e) => setDates((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {dates.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove date"
                  onClick={() => setDates((prev) => prev.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-600 px-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setDates((prev) => [...prev, ""])} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
            + Add date
          </button>
        </div>
      </div>
      <div className="md:col-span-4 flex items-center gap-3">
        <SubmitButton
          label={submitLabel}
          pendingLabel="Saving…"
          className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
        />
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg border border-gray-300">
            Cancel
          </button>
        )}
        {initial && initial.dates.some((d) => !dates.includes(d)) && (
          <p className="text-xs text-amber-700">Removing a date also deletes that date&apos;s check-ins.</p>
        )}
      </div>
    </form>
  );
}

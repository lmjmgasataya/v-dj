"use client";

import { useState, useTransition } from "react";
import { addConvergenceAttendance, deleteConvergenceAttendance } from "./actions";
import { inputCls } from "@/components/form";
import type { VgConvergenceAttendance } from "@/db/schema";

function Row({ entry }: { entry: VgConvergenceAttendance }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${entry.label}"?`)) return;
    startTransition(() => deleteConvergenceAttendance(entry.id));
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2.5 text-gray-700">{entry.label}</td>
      <td className="px-4 py-2.5 text-gray-500">{entry.eventDate}</td>
      <td className="px-4 py-2.5 text-gray-700 font-semibold">{entry.attendees}</td>
      <td className="px-4 py-2.5 text-right">
        <button onClick={handleDelete} disabled={pending} className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50">
          {pending ? "Deleting..." : "Delete"}
        </button>
      </td>
    </tr>
  );
}

export function ConvergenceSection({ entries }: { entries: VgConvergenceAttendance[] }) {
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await addConvergenceAttendance(formData);
      setAdding(false);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Leaders&apos; Convergence</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 bg-white px-3 py-1 rounded-lg transition"
          >
            + Add Entry
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">No attendance entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Label</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Attendees</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => <Row key={entry.id} entry={entry} />)}
            </tbody>
          </table>
        </div>
      )}
      {adding && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label</label>
            <input name="label" required placeholder="e.g. JUN 2026" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input name="eventDate" type="date" required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Attendees</label>
            <input name="attendees" type="number" min={0} required className={inputCls} />
          </div>
          <div className="sm:col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-gray-600 hover:text-gray-800 px-4 py-1.5 rounded-lg border border-gray-300 bg-white">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-5 py-1.5 rounded-lg transition">
              {pending ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

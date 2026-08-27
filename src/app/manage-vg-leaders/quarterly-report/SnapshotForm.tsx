"use client";

import { useState, useTransition } from "react";
import { createVgReportSnapshot, deleteVgReportSnapshot } from "./actions";
import { inputCls } from "@/components/form";
import type { VgReportSnapshot } from "@/db/schema";

export function SnapshotForm() {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createVgReportSnapshot(formData);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 bg-white px-3 py-1 rounded-lg transition"
      >
        + New Snapshot
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100"
    >
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Label <span className="text-red-500">*</span></label>
        <input name="label" required placeholder="e.g. Q3 2026" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">As of Date <span className="text-red-500">*</span></label>
        <input name="asOfDate" type="date" required className={inputCls} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">VG Leaders Goal</label>
        <input name="vgLeadersGoal" type="number" min={0} defaultValue={0} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Leadership Group Leaders Goal</label>
        <input name="leadershipGroupsGoal" type="number" min={0} defaultValue={0} className={inputCls} />
      </div>

      <p className="sm:col-span-2 text-xs text-gray-400">
        VG Leaders, Victory Groups, Interns, and Leadership Group Leaders are computed automatically from
        current data. Saving a snapshot with a label that already exists updates it instead of creating a
        duplicate.
      </p>

      <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-gray-600 hover:text-gray-800 px-4 py-1.5 rounded-lg border border-gray-300 bg-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-5 py-1.5 rounded-lg transition"
        >
          {pending ? "Saving..." : "Save Snapshot"}
        </button>
      </div>
    </form>
  );
}

export function SnapshotListItem({ snapshot }: { snapshot: VgReportSnapshot }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete snapshot "${snapshot.label}"?`)) return;
    startTransition(() => deleteVgReportSnapshot(snapshot.id));
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 bg-white">
      <div>
        <p className="text-sm font-medium text-gray-900">{snapshot.label}</p>
        <p className="text-xs text-gray-500">As of {snapshot.asOfDate}</p>
      </div>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

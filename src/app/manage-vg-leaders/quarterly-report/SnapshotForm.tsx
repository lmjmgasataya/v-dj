"use client";

import { useState, useTransition } from "react";
import { createVgReportSnapshot, updateVgReportSnapshot, deleteVgReportSnapshot } from "./actions";
import { inputCls } from "@/components/form";
import { SERVICE_BUCKETS, type VgSnapshotData, type VgBucketCounts } from "@/lib/vgSnapshot";
import type { VgReportSnapshot } from "@/db/schema";

const MANUAL_FIELDS: { key: string; label: string }[] = [
  { key: "vgLeaders", label: "VG Leaders" },
  { key: "victoryGroups", label: "Victory Groups" },
  { key: "interns", label: "Interns" },
  { key: "leadershipGroups", label: "Leadership Group Leaders" },
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
];

function SnapshotNumbersGrid({ data }: { data?: VgSnapshotData }) {
  function defaultFor(bucketIndex: number, key: string): number {
    if (!data) return 0;
    const bucket = SERVICE_BUCKETS[bucketIndex];
    if (key === "male") return data.vglByGender[bucket].male;
    if (key === "female") return data.vglByGender[bucket].female;
    return data.byService[bucket][key as keyof VgBucketCounts];
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-indigo-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Service</th>
            {MANUAL_FIELDS.map((f) => (
              <th key={f.key} className="px-3 py-2 text-left font-medium">{f.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {SERVICE_BUCKETS.map((bucket, i) => (
            <tr key={bucket}>
              <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap">{bucket}</td>
              {MANUAL_FIELDS.map((f) => (
                <td key={f.key} className="px-3 py-1.5">
                  <input
                    name={`m_${i}_${f.key}`}
                    type="number"
                    min={0}
                    defaultValue={defaultFor(i, f.key)}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SnapshotForm() {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");

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
      <input type="hidden" name="mode" value={mode} />

      <div className="sm:col-span-2 flex rounded-lg border border-indigo-200 overflow-hidden text-sm font-medium w-fit">
        <button
          type="button"
          onClick={() => setMode("auto")}
          className={`px-4 py-1.5 transition ${mode === "auto" ? "bg-[#00428E] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          Auto
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`px-4 py-1.5 transition border-l border-indigo-200 ${mode === "manual" ? "bg-[#00428E] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          Manual
        </button>
      </div>

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

      {mode === "auto" ? (
        <p className="sm:col-span-2 text-xs text-gray-400">
          VG Leaders, Victory Groups, Interns, and Leadership Group Leaders are computed automatically from
          current data. Saving a snapshot with a label that already exists updates it instead of creating a
          duplicate.
        </p>
      ) : (
        <div className="sm:col-span-2 flex flex-col gap-2">
          <p className="text-xs text-gray-400">
            Type in the numbers for each service (e.g. an existing baseline count kept outside this system).
            Totals are computed automatically from what you enter here.
          </p>
          <SnapshotNumbersGrid />
        </div>
      )}

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

function SnapshotEditForm({ snapshot, onDone }: { snapshot: VgReportSnapshot; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const data = snapshot.data as VgSnapshotData;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateVgReportSnapshot(snapshot.id, formData);
      onDone();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100"
    >
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Label <span className="text-red-500">*</span></label>
        <input name="label" required defaultValue={snapshot.label} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">As of Date <span className="text-red-500">*</span></label>
        <input name="asOfDate" type="date" required defaultValue={snapshot.asOfDate} className={inputCls} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">VG Leaders Goal</label>
        <input name="vgLeadersGoal" type="number" min={0} defaultValue={data.goals.vgLeaders} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Leadership Group Leaders Goal</label>
        <input name="leadershipGroupsGoal" type="number" min={0} defaultValue={data.goals.leadershipGroups} className={inputCls} />
      </div>

      <div className="sm:col-span-2 flex flex-col gap-2">
        <p className="text-xs text-gray-400">
          Editing overrides every number below and clears this snapshot&apos;s drill-down (the edited numbers no
          longer necessarily match a specific leader list).
        </p>
        <SnapshotNumbersGrid data={data} />
      </div>

      <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-gray-600 hover:text-gray-800 px-4 py-1.5 rounded-lg border border-gray-300 bg-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-5 py-1.5 rounded-lg transition"
        >
          {pending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

export function SnapshotListItem({ snapshot }: { snapshot: VgReportSnapshot }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  function handleDelete() {
    if (!confirm(`Delete snapshot "${snapshot.label}"?`)) return;
    startTransition(() => deleteVgReportSnapshot(snapshot.id));
  }

  if (editing) {
    return <SnapshotEditForm snapshot={snapshot} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 bg-white">
      <div>
        <p className="text-sm font-medium text-gray-900">{snapshot.label}</p>
        <p className="text-xs text-gray-500">As of {snapshot.asOfDate}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
        >
          {pending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

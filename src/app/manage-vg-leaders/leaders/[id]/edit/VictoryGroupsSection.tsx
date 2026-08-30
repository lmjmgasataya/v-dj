"use client";

import { useState, useTransition } from "react";
import { addVictoryGroup, updateVictoryGroup, deleteVictoryGroup } from "./victoryGroupActions";
import { inputCls, selectCls, CheckboxOption } from "@/components/form";
import type { VictoryGroup } from "@/db/schema";
import { dayOfWeekEnum, vgFrequencyEnum, lifestageEnum } from "@/db/schema";

const PLACE_OPTIONS = ["Victory Iloilo Center", "Others"];

const DAYS: (typeof dayOfWeekEnum.enumValues)[number][] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

const FREQUENCIES: (typeof vgFrequencyEnum.enumValues)[number][] = [
  "Weekly", "Every other week", "Once a month", "Others",
];

const LIFESTAGES = lifestageEnum.enumValues;

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 5; // 5 AM to 10 PM
  const ampm = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${ampm}`;
});

function GroupForm({
  defaultValues,
  onSave,
  onCancel,
  saveLabel,
}: {
  defaultValues?: Partial<VictoryGroup>;
  onSave: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [frequency, setFrequency] = useState(defaultValues?.frequency ?? "");
  const [placeChoice, setPlaceChoice] = useState(
    !defaultValues?.place || defaultValues.place === "Victory Iloilo Center" ? "Victory Iloilo Center" : "Others"
  );
  const [otherPlace, setOtherPlace] = useState(
    defaultValues?.place && defaultValues.place !== "Victory Iloilo Center" ? defaultValues.place : ""
  );
  const [lifeStages, setLifeStages] = useState<string[]>(defaultValues?.lifeStage ?? []);

  function toggleLifeStage(stage: string) {
    setLifeStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lifeStages.length === 0) {
      alert("Please select at least one Life Stage.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onSave(formData);
      onCancel();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Place <span className="text-red-500">*</span></label>
        <select
          value={placeChoice}
          onChange={(e) => setPlaceChoice(e.target.value)}
          className={selectCls}
        >
          {PLACE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {placeChoice === "Victory Iloilo Center" ? (
          <input type="hidden" name="place" value="Victory Iloilo Center" />
        ) : (
          <input
            name="place"
            required
            value={otherPlace}
            onChange={(e) => setOtherPlace(e.target.value)}
            placeholder="Specify place"
            className={`${inputCls} mt-2`}
          />
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Day <span className="text-red-500">*</span></label>
        <select name="day" required defaultValue={defaultValues?.day ?? ""} className={selectCls}>
          <option value="" disabled>Select day</option>
          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Time <span className="text-red-500">*</span></label>
        <select name="time" required defaultValue={defaultValues?.time ?? ""} className={selectCls}>
          <option value="" disabled>Select time</option>
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Frequency <span className="text-red-500">*</span></label>
        <select name="frequency" required value={frequency} onChange={(e) => setFrequency(e.target.value)} className={selectCls}>
          <option value="" disabled>Select frequency</option>
          {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      {frequency === "Others" && (
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Specify frequency <span className="text-red-500">*</span></label>
          <input name="otherFrequency" required defaultValue={defaultValues?.otherFrequency ?? ""} placeholder="e.g. Every 3rd Sunday of the month" className={inputCls} />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">Life Stage <span className="text-red-500">*</span></label>
        <div className="flex flex-col gap-2">
          {LIFESTAGES.map((s) => (
            <CheckboxOption
              key={s}
              name="lifeStage"
              value={s}
              checked={lifeStages.includes(s)}
              onChange={() => toggleLifeStage(s)}
            >
              {s}
            </CheckboxOption>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">Intern <span className="text-red-500">*</span></label>
        <input
          name="intern"
          required
          defaultValue={defaultValues?.intern ?? ""}
          placeholder="Last Name, First Name"
          className={inputCls}
        />
        <p className="text-xs text-gray-400 mt-1">Write &quot;None&quot; if there is none.</p>
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-800 px-4 py-1.5 rounded-lg border border-gray-300 bg-white">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-5 py-1.5 rounded-lg transition">
          {pending ? "Saving..." : saveLabel}
        </button>
      </div>
    </form>
  );
}

function GroupRow({
  group,
  vgLeaderId,
  label,
}: {
  group: VictoryGroup;
  vgLeaderId: number;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete this victory group (${DAY_ABBR[group.day]} ${group.time} @ ${group.place})?`)) return;
    startDeleteTransition(() => deleteVictoryGroup(group.id, vgLeaderId));
  }

  if (editing) {
    return (
      <GroupForm
        defaultValues={group}
        onSave={(formData) => updateVictoryGroup(group.id, vgLeaderId, formData)}
        onCancel={() => setEditing(false)}
        saveLabel="Save Changes"
      />
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              group.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {group.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {group.place} · {group.day} · {group.time} · {group.frequency === "Others" ? (group.otherFrequency ?? "Others") : group.frequency}
          {group.lifeStage?.length ? ` · ${group.lifeStage.join(", ")}` : ""}
          {group.intern ? ` · Intern: ${group.intern}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline">
          Edit
        </button>
        <button onClick={handleDelete} disabled={deletePending} className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50">
          {deletePending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

export function VictoryGroupsSection({
  groups,
  vgLeaderId,
}: {
  groups: VictoryGroup[];
  vgLeaderId: number;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Victory Groups</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 bg-white px-3 py-1 rounded-lg transition"
          >
            + Add Group
          </button>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3">
        {groups.length === 0 && !adding && (
          <p className="text-sm text-gray-400">No victory groups yet.</p>
        )}
        {groups.map((g, index) => (
          <GroupRow key={g.id} group={g} vgLeaderId={vgLeaderId} label={`Victory Group ${index + 1}`} />
        ))}
        {adding && (
          <GroupForm
            onSave={(formData) => addVictoryGroup(vgLeaderId, formData)}
            onCancel={() => setAdding(false)}
            saveLabel="Add Group"
          />
        )}
      </div>
    </div>
  );
}

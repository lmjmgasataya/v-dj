"use client";

import { useEffect, useState, useTransition } from "react";
import { inputCls, selectCls, CheckboxOption } from "@/components/form";
import type { VictoryGroup } from "@/db/schema";
import { dayOfWeekEnum, vgFrequencyEnum, lifestageEnum } from "@/db/schema";

type InternRow = { lastName: string; firstName: string };
type GroupType = "victory_group" | "leadership_group";
type Variant = "portal" | "admin";

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

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function GroupForm({
  defaultValues,
  defaultInterns,
  onSave,
  onCancel,
  saveLabel,
  groupType,
  variant,
}: {
  defaultValues?: Partial<VictoryGroup>;
  defaultInterns?: InternRow[];
  onSave: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  saveLabel: string;
  groupType: GroupType;
  variant: Variant;
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
  const [internRows, setInternRows] = useState<InternRow[]>(defaultInterns ?? []);
  const fieldCls = variant === "portal" ? `${inputCls} bg-white` : inputCls;
  const fieldSelectCls = variant === "portal" ? `${selectCls} bg-white` : selectCls;

  function toggleLifeStage(stage: string) {
    setLifeStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  }

  function updateInternRow(index: number, field: keyof InternRow, value: string) {
    setInternRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeInternRow(index: number) {
    setInternRows((prev) => prev.filter((_, i) => i !== index));
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
      <input type="hidden" name="type" value={groupType} />
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Place <span className="text-red-500">*</span></label>
        <select
          value={placeChoice}
          onChange={(e) => setPlaceChoice(e.target.value)}
          className={fieldSelectCls}
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
            className={`${fieldCls} mt-2`}
          />
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Day <span className="text-red-500">*</span></label>
        <select name="day" required defaultValue={defaultValues?.day ?? ""} className={fieldSelectCls}>
          <option value="" disabled>Select day</option>
          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Time <span className="text-red-500">*</span></label>
        <select name="time" required defaultValue={defaultValues?.time ?? ""} className={fieldSelectCls}>
          <option value="" disabled>Select time</option>
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Frequency <span className="text-red-500">*</span></label>
        <select name="frequency" required value={frequency} onChange={(e) => setFrequency(e.target.value)} className={fieldSelectCls}>
          <option value="" disabled>Select frequency</option>
          {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      {frequency === "Others" && (
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Specify frequency <span className="text-red-500">*</span></label>
          <input name="otherFrequency" required defaultValue={defaultValues?.otherFrequency ?? ""} placeholder="e.g. Every 3rd Sunday of the month" className={fieldCls} />
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
      {groupType === "victory_group" && (
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Interns</label>
          <div className="flex flex-col gap-2">
            {internRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  name={`intern_${i}_lastName`}
                  value={row.lastName}
                  onChange={(e) => updateInternRow(i, "lastName", e.target.value)}
                  placeholder="Last Name"
                  className={fieldCls}
                />
                <input
                  name={`intern_${i}_firstName`}
                  value={row.firstName}
                  onChange={(e) => updateInternRow(i, "firstName", e.target.value)}
                  placeholder="First Name"
                  className={fieldCls}
                />
                <button
                  type="button"
                  onClick={() => removeInternRow(i)}
                  className="shrink-0 text-xs text-red-500 hover:text-red-700 px-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setInternRows((prev) => [...prev, { lastName: "", firstName: "" }])}
            className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 bg-white px-3 py-1 rounded-lg transition"
          >
            + Add Intern
          </button>
        </div>
      )}
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
  interns,
  label,
  variant,
  readOnly,
  editing,
  onEditingChange,
  onUpdate,
  onDelete,
}: {
  group: VictoryGroup;
  interns: InternRow[];
  label: string;
  variant: Variant;
  readOnly: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onUpdate: (id: number, formData: FormData) => Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}) {
  const [deletePending, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete this group (${DAY_ABBR[group.day]} ${group.time} @ ${group.place})?`)) return;
    startDeleteTransition(() => onDelete(group.id));
  }

  if (editing) {
    return (
      <GroupForm
        defaultValues={group}
        defaultInterns={interns}
        onSave={(formData) => onUpdate(group.id, formData)}
        onCancel={() => onEditingChange(false)}
        saveLabel="Save Changes"
        groupType={group.type}
        variant={variant}
      />
    );
  }

  const internNames = interns.map((i) => `${i.lastName}, ${i.firstName}`).join("; ");

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          {variant === "admin" && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                group.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {group.isActive ? "Active" : "Inactive"}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {group.place} · {group.day} · {group.time} · {group.frequency === "Others" ? (group.otherFrequency ?? "Others") : group.frequency}
          {group.lifeStage?.length ? ` · ${group.lifeStage.join(", ")}` : ""}
          {internNames ? ` · Interns: ${internNames}` : ""}
        </p>
      </div>
      {!readOnly && (variant === "portal" ? (
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            onClick={() => onEditingChange(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 bg-white px-3 py-1 rounded-lg transition"
          >
            <PencilIcon />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deletePending}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 border border-red-300 bg-white px-3 py-1 rounded-lg transition disabled:opacity-50"
          >
            <TrashIcon />
            {deletePending ? "Deleting..." : "Delete"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <button onClick={() => onEditingChange(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline">
            Edit
          </button>
          <button onClick={handleDelete} disabled={deletePending} className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50">
            {deletePending ? "Deleting..." : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}

export function VictoryGroupsPanel({
  groups,
  internsByGroup,
  groupType,
  title,
  addButtonLabel = "+ Add Group",
  saveLabel = "Add Group",
  emptyLabel = "No groups yet.",
  rowLabel = "Victory Group",
  variant,
  readOnly = false,
  onDirtyChange,
  onAdd,
  onUpdate,
  onDelete,
}: {
  groups: VictoryGroup[];
  internsByGroup: Record<number, InternRow[]>;
  groupType: GroupType;
  title: string;
  addButtonLabel?: string;
  saveLabel?: string;
  emptyLabel?: string;
  rowLabel?: string;
  variant: Variant;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onAdd: (formData: FormData) => Promise<void>;
  onUpdate: (id: number, formData: FormData) => Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    onDirtyChange?.(adding || editingId !== null);
  }, [adding, editingId, onDirtyChange]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">{title}</h2>
        {!readOnly && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 bg-white px-3 py-1 rounded-lg transition"
          >
            {addButtonLabel}
          </button>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3">
        {groups.length === 0 && !adding && (
          <p className="text-sm text-gray-400">{emptyLabel}</p>
        )}
        {groups.map((g, index) => (
          <GroupRow
            key={g.id}
            group={g}
            interns={internsByGroup[g.id] ?? []}
            label={`${rowLabel} ${index + 1}`}
            variant={variant}
            readOnly={readOnly}
            editing={editingId === g.id}
            onEditingChange={(editing) => setEditingId(editing ? g.id : null)}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
        {!readOnly && adding && (
          <GroupForm
            onSave={onAdd}
            onCancel={() => setAdding(false)}
            saveLabel={saveLabel}
            groupType={groupType}
            variant={variant}
          />
        )}
      </div>
    </div>
  );
}

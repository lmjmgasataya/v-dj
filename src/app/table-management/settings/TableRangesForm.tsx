"use client";

import { useState, useTransition } from "react";
import type { TableRange } from "@/lib/tables";
import { updateTableRanges } from "./actions";

function validateRanges(ranges: TableRange[]): (string | null)[] {
  const errors: (string | null)[] = ranges.map((r) => {
    if (!Number.isInteger(r.start) || r.start < 1) return "Start must be a whole number ≥ 1";
    if (!Number.isInteger(r.end) || r.end < r.start) return "End must be a whole number ≥ start";
    if (!Number.isInteger(r.capacity) || r.capacity < 1) return "Capacity must be a whole number ≥ 1";
    return null;
  });

  const sorted = ranges
    .map((r, i) => ({ ...r, i }))
    .filter((r) => errors[r.i] == null)
    .sort((a, b) => a.start - b.start);

  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k].start <= sorted[k - 1].end) {
      errors[sorted[k].i] = `Overlaps table ${sorted[k].start} with the ${sorted[k - 1].start}–${sorted[k - 1].end} range above`;
    }
  }

  return errors;
}

export function TableRangesForm({ initialRanges }: { initialRanges: TableRange[] }) {
  const [ranges, setRanges] = useState<TableRange[]>(initialRanges);
  const [isPending, startTransition] = useTransition();

  const errors = validateRanges(ranges);
  const isValid = ranges.length > 0 && errors.every((e) => e == null);

  function updateField(index: number, field: keyof TableRange, value: number) {
    setRanges((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRange() {
    const last = ranges[ranges.length - 1];
    const start = last ? last.end + 1 : 1;
    setRanges((prev) => [...prev, { start, end: start, capacity: 1 }]);
  }

  function removeRange(index: number) {
    setRanges((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    startTransition(() => {
      updateTableRanges(ranges);
    });
  }

  const totalTables = ranges.reduce((max, r) => Math.max(max, Number(r.end) || 0), 0);
  const totalSeats = ranges.reduce(
    (sum, r) => sum + (Number(r.capacity) || 0) * Math.max(0, (Number(r.end) || 0) - (Number(r.start) || 0) + 1),
    0
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From Table</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To Table</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity</span>
        <span />
      </div>

      {ranges.map((range, i) => {
        const error = errors[i];
        const inputCls = `w-full text-sm border rounded-lg px-3 py-2 ${error ? "border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300" : "border-gray-200"}`;
        return (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center">
              <input
                type="number"
                min={1}
                required
                value={range.start}
                onChange={(e) => updateField(i, "start", Number(e.target.value))}
                className={inputCls}
              />
              <input
                type="number"
                min={1}
                required
                value={range.end}
                onChange={(e) => updateField(i, "end", Number(e.target.value))}
                className={inputCls}
              />
              <input
                type="number"
                min={1}
                required
                value={range.capacity}
                onChange={(e) => updateField(i, "capacity", Number(e.target.value))}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => removeRange(i)}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-2"
              >
                Remove
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRange}
        className="self-start text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        + Add range
      </button>

      {ranges.length === 0 && <p className="text-xs text-red-600">Add at least one table range.</p>}

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">
          {totalTables} table{totalTables !== 1 ? "s" : ""}, {totalSeats} seat{totalSeats !== 1 ? "s" : ""} total
        </p>
        <button
          type="submit"
          disabled={isPending || !isValid}
          className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

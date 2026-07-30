"use client";

import { useState, useTransition } from "react";
import type { TableRange } from "@/lib/tables";
import { updateTableRanges } from "./actions";

export function TableRangesForm({ initialRanges }: { initialRanges: TableRange[] }) {
  const [ranges, setRanges] = useState<TableRange[]>(initialRanges);
  const [isPending, startTransition] = useTransition();

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

      {ranges.map((range, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center">
          <input
            type="number"
            min={1}
            required
            value={range.start}
            onChange={(e) => updateField(i, "start", Number(e.target.value))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
          />
          <input
            type="number"
            min={1}
            required
            value={range.end}
            onChange={(e) => updateField(i, "end", Number(e.target.value))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
          />
          <input
            type="number"
            min={1}
            required
            value={range.capacity}
            onChange={(e) => updateField(i, "capacity", Number(e.target.value))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
          />
          <button
            type="button"
            onClick={() => removeRange(i)}
            className="text-xs text-red-500 hover:text-red-700 font-medium px-2"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRange}
        className="self-start text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        + Add range
      </button>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">
          {totalTables} table{totalTables !== 1 ? "s" : ""}, {totalSeats} seat{totalSeats !== 1 ? "s" : ""} total
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";

export interface QuarterlyStatusRow {
  service: string;
  total: number;
  done: number;
  notDone: number;
}

type SortKey = "service" | "total" | "done" | "notDone";
type SortDir = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "service", label: "Service", align: "left" },
  { key: "total", label: "Total", align: "right" },
  { key: "done", label: "Done", align: "right" },
  { key: "notDone", label: "Not Done", align: "right" },
];

function sortValue(r: QuarterlyStatusRow, key: SortKey): string | number {
  switch (key) {
    case "service": return r.service.toLowerCase();
    case "total": return r.total;
    case "done": return r.done;
    case "notDone": return r.notDone;
  }
}

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

export function QuarterlyStatusTable({
  data,
  totals,
}: {
  data: QuarterlyStatusRow[];
  totals: { total: number; done: number; notDone: number };
}) {
  const [sortKey, setSortKey] = useState<SortKey>("service");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = sortValue(a, sortKey);
    const bv = sortValue(b, sortKey);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          {SORT_COLUMNS.map((col) => (
            <th key={col.key} className={`px-4 py-2 font-medium ${col.align === "right" ? "text-right" : "text-left"}`}>
              <button
                type="button"
                onClick={() => toggleSort(col.key)}
                className={`flex items-center gap-0.5 hover:text-gray-800 select-none ${col.align === "right" ? "ml-auto" : ""}`}
              >
                {col.label}
                <span className={sortKey === col.key ? "text-gray-700" : "text-gray-300"}>
                  {sortIcon(col.key, sortKey, sortDir)}
                </span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {sorted.map((r) => (
          <tr key={r.service} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-medium text-gray-800">{r.service}</td>
            <td className="px-4 py-2.5 text-right text-gray-500">{r.total}</td>
            <td className="px-4 py-2.5 text-right text-gray-500">{r.done}</td>
            <td className="px-4 py-2.5 text-right text-gray-500">{r.notDone}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-gray-200 font-semibold">
          <td className="px-4 py-2.5 text-gray-800">Total</td>
          <td className="px-4 py-2.5 text-right text-gray-800">{totals.total}</td>
          <td className="px-4 py-2.5 text-right text-gray-800">{totals.done}</td>
          <td className="px-4 py-2.5 text-right text-gray-800">{totals.notDone}</td>
        </tr>
      </tfoot>
    </table>
  );
}

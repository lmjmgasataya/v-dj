"use client";

import { useState } from "react";

export interface QuarterlyRosterRow {
  id: number;
  name: string;
  service: string;
  done: boolean;
}

type SortKey = "name" | "service" | "status";
type SortDir = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "service", label: "Service" },
  { key: "status", label: "Status" },
];

function sortValue(r: QuarterlyRosterRow, key: SortKey): string | number {
  switch (key) {
    case "name": return r.name.toLowerCase();
    case "service": return r.service.toLowerCase();
    case "status": return r.done ? 1 : 0;
  }
}

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

export function QuarterlyRosterTable({ rows }: { rows: QuarterlyRosterRow[] }) {
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

  const sorted = [...rows].sort((a, b) => {
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
            <th key={col.key} className="px-4 py-2 text-left font-medium">
              <button
                type="button"
                onClick={() => toggleSort(col.key)}
                className="flex items-center gap-0.5 hover:text-gray-800 select-none"
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
          <tr key={r.id} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-medium text-gray-800">{r.name}</td>
            <td className="px-4 py-2.5 text-gray-500">{r.service}</td>
            <td className="px-4 py-2.5">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  r.done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {r.done ? "Done" : "Not Done"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

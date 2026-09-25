"use client";

import { useState } from "react";
import Link from "next/link";

export interface DiscipleshipJourneyRow {
  id: number;
  name: string;
  leadership113: boolean | null;
  steps: Record<string, boolean>;
}

type SortKey = "name" | "leadership113" | `step:${string}`;
type SortDir = "asc" | "desc";

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

export function DiscipleshipJourneyTable({
  rows,
  steps,
}: {
  rows: DiscipleshipJourneyRow[];
  steps: readonly string[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  }

  function sortValue(r: DiscipleshipJourneyRow, key: SortKey): string | number {
    if (key === "name") return r.name.toLowerCase();
    if (key === "leadership113") return r.leadership113 == null ? 0 : r.leadership113 ? 2 : 1;
    const step = key.slice("step:".length);
    return r.steps[step] ? 1 : 0;
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
          <th className="px-4 py-2 text-left font-medium">
            <button
              type="button"
              onClick={() => toggleSort("name")}
              className="flex items-center gap-0.5 hover:text-gray-800 select-none"
            >
              Name
              <span className={sortKey === "name" ? "text-gray-700" : "text-gray-300"}>
                {sortIcon("name", sortKey, sortDir)}
              </span>
            </button>
          </th>
          {steps.map((step) => {
            const key: SortKey = `step:${step}`;
            return (
              <th key={step} className="px-4 py-2 text-center font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort(key)}
                  className="flex items-center justify-center gap-0.5 hover:text-gray-800 select-none mx-auto"
                >
                  {step}
                  <span className={sortKey === key ? "text-gray-700" : "text-gray-300"}>
                    {sortIcon(key, sortKey, sortDir)}
                  </span>
                </button>
              </th>
            );
          })}
          <th className="px-4 py-2 text-center font-medium">
            <button
              type="button"
              onClick={() => toggleSort("leadership113")}
              className="flex items-center justify-center gap-0.5 hover:text-gray-800 select-none mx-auto"
            >
              L113 Graduate
              <span className={sortKey === "leadership113" ? "text-gray-700" : "text-gray-300"}>
                {sortIcon("leadership113", sortKey, sortDir)}
              </span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {sorted.map((r) => (
          <tr key={r.id} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">
              <Link href={`/vg-leader-portal/leaders/${r.id}`} className="text-indigo-600 hover:text-indigo-800 underline">
                {r.name}
              </Link>
            </td>
            {steps.map((step) => (
              <td key={step} className="px-4 py-2.5 text-center">
                {r.steps[step] ? (
                  <span className="text-green-600 font-semibold">✓</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            ))}
            <td className="px-4 py-2.5 text-center">
              {r.leadership113 == null ? (
                <span className="text-gray-300">Not set</span>
              ) : r.leadership113 ? (
                <span className="text-green-600 font-semibold">Yes</span>
              ) : (
                <span className="text-amber-600">No</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

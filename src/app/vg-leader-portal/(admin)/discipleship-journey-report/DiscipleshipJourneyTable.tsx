"use client";

import { useState } from "react";
import Link from "next/link";
import type { Leadership113Status } from "@/lib/leadership113";

const LEADERSHIP_113_SORT: Record<Leadership113Status, number> = { no: 1, ongoing: 2, yes: 3 };

export interface DiscipleshipJourneyRow {
  id: number;
  name: string;
  service: string;
  /** Position of `service` in the standard service order, for sorting. */
  serviceRank: number;
  leadership113: Leadership113Status | null;
  steps: Record<string, boolean>;
}

type SortKey = "name" | "service" | "leadership113" | `step:${string}`;
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
    if (key === "service") return r.serviceRank;
    if (key === "leadership113") return r.leadership113 == null ? 0 : LEADERSHIP_113_SORT[r.leadership113];
    const step = key.slice("step:".length);
    return r.steps[step] ? 1 : 0;
  }

  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, sortKey);
    const bv = sortValue(b, sortKey);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  // The Name column stays put while the steps scroll sideways. A sticky cell needs its own
  // background (rows behind it would show through), so it follows the row's hover via `group`.
  const stickyName = "sticky left-0 z-10 shadow-[inset_-1px_0_0_#e5e7eb]";

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          <th className={`${stickyName} bg-gray-50 px-4 py-2 text-left font-medium`}>
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
          <th className="px-4 py-2 text-left font-medium">
            <button
              type="button"
              onClick={() => toggleSort("service")}
              className="flex items-center gap-0.5 hover:text-gray-800 select-none"
            >
              Service
              <span className={sortKey === "service" ? "text-gray-700" : "text-gray-300"}>
                {sortIcon("service", sortKey, sortDir)}
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
          <tr key={r.id} className="group hover:bg-gray-50">
            <td className={`${stickyName} bg-white group-hover:bg-gray-50 px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap`}>
              <Link href={`/vg-leader-portal/leaders/${r.id}`} className="text-indigo-600 hover:text-indigo-800 underline">
                {r.name}
              </Link>
            </td>
            <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.service}</td>
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
              ) : r.leadership113 === "yes" ? (
                <span className="text-green-600 font-semibold">Yes</span>
              ) : r.leadership113 === "ongoing" ? (
                <span className="text-blue-600">Ongoing</span>
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

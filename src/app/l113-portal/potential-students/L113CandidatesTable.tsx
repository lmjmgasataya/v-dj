"use client";

import { useState } from "react";
import Link from "next/link";

export interface L113CandidateRow {
  id: number;
  name: string;
  service: string;
  /** Position of `service` in the standard service order, for sorting. */
  serviceRank: number;
  doneWithJourney: boolean;
  empoweringLeaders: boolean;
}

type SortKey = "name" | "service" | "doneWithJourney" | "empoweringLeaders";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; center?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "service", label: "Service" },
  { key: "doneWithJourney", label: "Done with Discipleship Journey", center: true },
  { key: "empoweringLeaders", label: "Empowering Leaders", center: true },
];

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

function DoneBadge({ done }: { done: boolean }) {
  return done ? (
    <span className="text-green-600 font-semibold">Done</span>
  ) : (
    <span className="text-amber-600">Not Done</span>
  );
}

export function L113CandidatesTable({ rows }: { rows: L113CandidateRow[] }) {
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

  function sortValue(r: L113CandidateRow, key: SortKey): string | number {
    if (key === "name") return r.name.toLowerCase();
    if (key === "service") return r.serviceRank;
    return r[key] ? 1 : 0;
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
          {COLUMNS.map(({ key, label, center }) => (
            <th key={key} className={`px-4 py-2 font-medium ${center ? "text-center" : "text-left"}`}>
              <button
                type="button"
                onClick={() => toggleSort(key)}
                className={`flex items-center gap-0.5 hover:text-gray-800 select-none ${center ? "justify-center mx-auto" : ""}`}
              >
                {label}
                <span className={sortKey === key ? "text-gray-700" : "text-gray-300"}>{sortIcon(key, sortKey, sortDir)}</span>
              </button>
            </th>
          ))}
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
            <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.service}</td>
            <td className="px-4 py-2.5 text-center">
              <DoneBadge done={r.doneWithJourney} />
            </td>
            <td className="px-4 py-2.5 text-center">
              <DoneBadge done={r.empoweringLeaders} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

export interface IssueRow {
  key: string;
  name: string;
  nameHref?: string;
  service: string;
  // Position of the service in SERVICE_OPTIONS so sorting follows service
  // order rather than alphabetical ("10AM" before "9AM").
  serviceRank: number;
  detail: ReactNode;
  detailSort: string;
}

type SortKey = "name" | "service" | "detail";
type SortDir = "asc" | "desc";

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

function compare(a: IssueRow, b: IssueRow, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "service":
      return a.serviceRank - b.serviceRank || a.service.localeCompare(b.service);
    case "detail":
      return a.detailSort.localeCompare(b.detailSort);
  }
}

export function IssueTable({ rows, detailLabel }: { rows: IssueRow[]; detailLabel: string }) {
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
    const cmp = compare(a, b, sortKey) || a.name.localeCompare(b.name);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "service", label: "Service" },
    { key: "detail", label: detailLabel },
  ];

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          {columns.map((col) => (
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
          <tr key={r.key} className="hover:bg-gray-50 align-top">
            <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">
              {r.nameHref ? (
                <Link href={r.nameHref} className="text-indigo-600 hover:text-indigo-800 underline">
                  {r.name}
                </Link>
              ) : (
                r.name
              )}
            </td>
            <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.service}</td>
            <td className="px-4 py-2.5 text-gray-600">{r.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

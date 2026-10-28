"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { serviceRank } from "@/lib/serviceOrder";

export interface LeadershipGroupLeaderRow {
  id: number;
  name: string;
  service: string;
  /** The VG leaders in their Leadership Group, sorted by name. */
  members: { id: number; name: string }[];
}

type SortKey = "name" | "service" | "members";
type SortDir = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "service", label: "Service" },
  { key: "members", label: "VGL/s They Lead" },
];

function sortValue(r: LeadershipGroupLeaderRow, key: SortKey): string | number {
  switch (key) {
    case "name": return r.name.toLowerCase();
    case "service": return serviceRank(r.service);
    case "members": return r.members.map((m) => m.name).join("; ").toLowerCase();
  }
}

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

export function LeadershipGroupLeadersTable({ rows }: { rows: LeadershipGroupLeaderRow[] }) {
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
        {sorted.map((l) => (
          <tr key={l.id} className="hover:bg-gray-50 align-top">
            <td className="px-4 py-2.5 font-medium text-gray-800">
              <Link href={`/vg-leader-portal/leaders/${l.id}`} className="text-indigo-600 hover:text-indigo-800 underline">
                {l.name}
              </Link>
            </td>
            <td className="px-4 py-2.5 text-gray-500">{l.service}</td>
            <td className="px-4 py-2.5 text-gray-500">
              {l.members.length === 0
                ? "—"
                : l.members.map((m, i) => (
                    <Fragment key={m.id}>
                      {i > 0 && "; "}
                      <Link href={`/vg-leader-portal/leaders/${m.id}`} className="text-indigo-600 hover:text-indigo-800 underline">
                        {m.name}
                      </Link>
                    </Fragment>
                  ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

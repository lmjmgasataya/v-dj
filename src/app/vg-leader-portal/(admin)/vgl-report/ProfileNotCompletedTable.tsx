"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProfileNotCompletedRow } from "@/lib/vglProfileNotCompleted";
import { remarkKind, type RemarkKind } from "@/lib/vglRemarks";

// Very light tints so several tags in one row stay easy on the eye. `chipActive` is the
// selected filter chip — one step stronger plus a ring, same hue.
const REMARK_STYLE: Record<RemarkKind, { tag: string; chipActive: string }> = {
  byLgl: {
    tag: "bg-sky-50 text-sky-700 border-sky-100",
    chipActive: "bg-sky-100 text-sky-800 ring-1 ring-sky-300",
  },
  byParticipant: {
    tag: "bg-violet-50 text-violet-700 border-violet-100",
    chipActive: "bg-violet-100 text-violet-800 ring-1 ring-violet-300",
  },
  claimedIncomplete: {
    tag: "bg-amber-50 text-amber-700 border-amber-100",
    chipActive: "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
  },
  manualIncomplete: {
    tag: "bg-emerald-50 text-emerald-700 border-emerald-100",
    chipActive: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
  },
  manualMissing: {
    tag: "bg-rose-50 text-rose-700 border-rose-100",
    chipActive: "bg-rose-100 text-rose-800 ring-1 ring-rose-300",
  },
};

function RemarkTag({ remark }: { remark: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${REMARK_STYLE[remarkKind(remark)].tag}`}
    >
      {remark}
    </span>
  );
}

type SortKey = "name" | "service" | "remarks";
type SortDir = "asc" | "desc";

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

function compare(
  a: ProfileNotCompletedRow,
  b: ProfileNotCompletedRow,
  key: SortKey,
): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "service":
      return (
        a.serviceRank - b.serviceRank || a.service.localeCompare(b.service)
      );
    case "remarks":
      return a.remarks.join("; ").localeCompare(b.remarks.join("; "));
  }
}

export function ProfileNotCompletedTable({
  rows,
  remarkCounts,
}: {
  rows: ProfileNotCompletedRow[];
  remarkCounts: { remark: string; count: number }[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("service");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [remarkFilter, setRemarkFilter] = useState<string | null>(null);

  function toggleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  }

  const visible = (
    remarkFilter ? rows.filter((r) => r.remarks.includes(remarkFilter)) : rows
  ).sort((a, b) => {
    const cmp = compare(a, b, sortKey) || a.name.localeCompare(b.name);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "service", label: "Service" },
    { key: "remarks", label: "Remarks" },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setRemarkFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            remarkFilter == null
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({rows.length})
        </button>
        {remarkCounts.map(({ remark, count }) => {
          const style = REMARK_STYLE[remarkKind(remark)];
          return (
            <button
              key={remark}
              type="button"
              onClick={() =>
                setRemarkFilter(remarkFilter === remark ? null : remark)
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                remarkFilter === remark
                  ? `border-transparent ${style.chipActive}`
                  : `${style.tag} hover:brightness-95`
              }`}
            >
              {remark} ({count})
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
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
                    <span
                      className={
                        sortKey === col.key ? "text-gray-700" : "text-gray-300"
                      }
                    >
                      {sortIcon(col.key, sortKey, sortDir)}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((r) => (
              <tr key={r.key} className="align-top hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  {r.leaderId != null ? (
                    <Link
                      href={`/vg-leader-portal/leaders/${r.leaderId}`}
                      className="text-indigo-600 hover:text-indigo-800 underline"
                    >
                      {r.name}
                    </Link>
                  ) : (
                    <span className="text-gray-800">{r.name}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                  {r.service}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {r.remarks.map((remark) => (
                      <RemarkTag key={remark} remark={remark} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

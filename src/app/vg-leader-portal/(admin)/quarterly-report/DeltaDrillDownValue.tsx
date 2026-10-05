"use client";

import { useState } from "react";
import { DrillDownTable } from "./DrillDownTable";
import { DrillLoading, useDrillLists } from "./DrillSource";
import type { DrillItem } from "@/lib/vgSnapshot";

type Tab = "added" | "removed" | "all";
type Status = "kept" | "added" | "removed";

/**
 * Everyone from both snapshots in one A–Z list, one name per row, placed in the column
 * for where they stand: in both, added, or removed.
 */
function ComparisonTable({ kept, added, removed }: { kept: DrillItem[]; added: DrillItem[]; removed: DrillItem[] }) {
  const rows = [
    ...kept.map((item) => ({ item, status: "kept" as Status })),
    ...added.map((item) => ({ item, status: "added" as Status })),
    ...removed.map((item) => ({ item, status: "removed" as Status })),
  ].sort((a, b) => a.item.label.localeCompare(b.item.label));

  if (rows.length === 0) return <p className="px-5 py-6 text-sm text-gray-400 text-center">No names.</p>;

  // `cell` applies only to the column holding the name, so each row has one shaded slot.
  const columns: { status: Status; label: string; count: number; cell: string }[] = [
    { status: "kept", label: "In both", count: kept.length, cell: "text-gray-800" },
    { status: "added", label: "Added", count: added.length, cell: "bg-green-100 text-green-900" },
    { status: "removed", label: "Removed", count: removed.length, cell: "bg-red-100 text-red-900" },
  ];

  return (
    <table className="w-full text-sm table-fixed">
      <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          <th className="w-10 px-3 py-2 text-right font-medium">#</th>
          {columns.map((c) => (
            <th key={c.status} className="px-3 py-2 text-left font-medium">
              {c.label} <span className="font-normal normal-case text-gray-400">({c.count})</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map(({ item, status }, i) => (
          <tr key={i} className="hover:bg-gray-50 align-top">
            <td className="px-3 py-2 text-right text-xs text-gray-400 tabular-nums">{i + 1}</td>
            {columns.map((c) => (
              <td key={c.status} className={`px-3 py-2 break-words ${c.status === status ? c.cell : ""}`}>
                {c.status === status && (
                  <>
                    {item.label}
                    {item.service && <span className="block text-xs opacity-60">{item.service}</span>}
                  </>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The change between two snapshots for one cell. `change` holds the list sizes (null when a
 * side has no name lists); the names themselves are fetched from the surrounding DrillSource
 * when the popup opens.
 */
export function DeltaDrillDownValue({
  diff,
  cellKey,
  change,
}: {
  diff: number;
  cellKey: string;
  change: { added: number; removed: number; kept: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("added");
  const { lists, error } = useDrillLists(cellKey, open && !!change);

  const hasNames = !!change;
  // A net 0 can still hide people leaving and others joining — keep that clickable.
  const churn = hasNames && (change.added > 0 || change.removed > 0);
  if (diff === 0 && !churn) return <span className="text-gray-400">–</span>;

  const color = diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500";
  const label = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "±0";

  if (!hasNames) {
    return <span className={`${color} font-semibold`}>{label}</span>;
  }
  const added = lists?.added ?? null;
  const removed = lists?.removed ?? null;
  const kept = lists?.kept ?? null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Open on whichever side has people, preferring Added.
          setTab(change.added > 0 || change.removed === 0 ? "added" : "removed");
          setOpen(true);
        }}
        className={`${color} font-semibold underline decoration-dotted hover:opacity-80`}
      >
        {label}
      </button>
      {/* Gross movement behind the net number, e.g. "+12 / −8". */}
      {change.added > 0 && change.removed > 0 && (
        <span className="ml-1.5 text-xs font-normal text-gray-400">
          (<span className="text-green-600">+{change.added}</span> / <span className="text-red-600">−{change.removed}</span>)
        </span>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setOpen(false)}>
          <div
            className={`bg-white rounded-xl shadow-lg ${tab === "all" ? "max-w-4xl" : "max-w-2xl"} w-full max-h-[75vh] flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <p className="text-sm font-semibold text-gray-800">Change: {label}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div role="tablist" className="flex gap-1 px-5 pt-3 border-b border-gray-100 shrink-0">
              {(
                [
                  { key: "added", label: "Added", count: change.added, active: "border-green-600 text-green-700" },
                  { key: "removed", label: "Removed", count: change.removed, active: "border-red-600 text-red-700" },
                  { key: "all", label: "All", count: change.kept + change.added + change.removed, active: "border-indigo-600 text-indigo-700" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                    tab === t.key ? t.active : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {t.label}
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                      tab === t.key
                        ? t.key === "added"
                          ? "bg-green-100 text-green-700"
                          : t.key === "removed"
                            ? "bg-red-100 text-red-700"
                            : "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
            <div role="tabpanel" className="overflow-y-auto">
              {!added || !removed || !kept ? (
                <DrillLoading error={error} />
              ) : tab === "all" ? (
                <ComparisonTable kept={kept} added={added} removed={removed} />
              ) : (
                <DrillDownTable
                  items={tab === "added" ? added : removed}
                  emptyText={tab === "added" ? "No one added." : "No one removed."}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

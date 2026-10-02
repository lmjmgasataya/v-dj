"use client";

import { useState } from "react";
import { DrillDownTable } from "./DrillDownTable";
import type { DrillItem } from "@/lib/vgSnapshot";

type Tab = "added" | "removed";

export function DeltaDrillDownValue({
  diff,
  added,
  removed,
}: {
  diff: number;
  added: DrillItem[] | null;
  removed: DrillItem[] | null;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("added");

  const hasNames = !!added && !!removed;
  // A net 0 can still hide people leaving and others joining — keep that clickable.
  const churn = hasNames && (added.length > 0 || removed.length > 0);
  if (diff === 0 && !churn) return <span className="text-gray-400">–</span>;

  const color = diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500";
  const label = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "±0";

  if (!hasNames) {
    return <span className={`${color} font-semibold`}>{label}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Open on whichever side has people, preferring Added.
          setTab(added.length > 0 || removed.length === 0 ? "added" : "removed");
          setOpen(true);
        }}
        className={`${color} font-semibold underline decoration-dotted hover:opacity-80`}
      >
        {label}
      </button>
      {/* Gross movement behind the net number, e.g. "+12 / −8". */}
      {added.length > 0 && removed.length > 0 && (
        <span className="ml-1.5 text-xs font-normal text-gray-400">
          (<span className="text-green-600">+{added.length}</span> / <span className="text-red-600">−{removed.length}</span>)
        </span>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[75vh] flex flex-col overflow-hidden"
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
                  { key: "added", label: "Added", count: added.length, active: "border-green-600 text-green-700" },
                  { key: "removed", label: "Removed", count: removed.length, active: "border-red-600 text-red-700" },
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
                          : "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
            <div role="tabpanel" className="overflow-y-auto">
              <DrillDownTable
                items={tab === "added" ? added : removed}
                emptyText={tab === "added" ? "No one added." : "No one removed."}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

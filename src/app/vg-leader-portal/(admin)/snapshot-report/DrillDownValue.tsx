"use client";

import { useState } from "react";
import { DrillDownTable } from "./DrillDownTable";
import { DrillLoading, useDrillLists } from "./DrillSource";
import type { DrillItem } from "@/lib/vgSnapshot";

/**
 * A number that opens the names behind it. Pass `items` directly, or `lazy` to fetch them from
 * the surrounding DrillSource when the popup opens (pass `lazy` only when there are names).
 */
export function DrillDownValue({
  value,
  items,
  lazy,
  className,
}: {
  value: number;
  items?: DrillItem[] | null;
  lazy?: { cellKey: string; side: "detail" | "prevDetail" } | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { lists, error } = useDrillLists(lazy?.cellKey ?? "", open && !!lazy);
  const shown = lazy ? (lists?.[lazy.side] ?? null) : items;

  if (!lazy && !items?.length) return <span className={className}>{value}</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`underline decoration-dotted decoration-gray-400 hover:text-indigo-600 hover:decoration-indigo-400 ${className ?? ""}`}
      >
        {value}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[75vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <p className="text-sm font-semibold text-gray-800">Total: {shown?.length ?? value}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto">
              {shown ? <DrillDownTable items={shown} emptyText="No one listed." /> : <DrillLoading error={error} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

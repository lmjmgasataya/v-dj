"use client";

import { useState } from "react";
import { DrillDownTable } from "./DrillDownTable";
import type { DrillItem } from "@/lib/vgSnapshot";

export function DrillDownValue({
  value,
  items,
  className,
}: {
  value: number;
  items: DrillItem[] | null | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!items || items.length === 0) {
    return <span className={className}>{value}</span>;
  }

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
              <p className="text-sm font-semibold text-gray-800">Total: {items.length}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto">
              <DrillDownTable items={items} emptyText="No one listed." />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

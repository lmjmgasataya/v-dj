"use client";

import { useState } from "react";

export function DrillDownValue({
  value,
  items,
  className,
}: {
  value: number;
  items: string[] | null | undefined;
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
            className="bg-white rounded-xl shadow-lg max-w-sm w-full max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <p className="text-sm font-semibold text-gray-800">{items.length} total</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <ul className="overflow-y-auto px-5 py-3 flex flex-col gap-1.5">
              {items.map((item, i) => (
                <li key={i} className="text-sm text-gray-700">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

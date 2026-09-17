"use client";

import { useState } from "react";

export function DeltaDrillDownValue({
  diff,
  added,
  removed,
}: {
  diff: number;
  added: string[] | null;
  removed: string[] | null;
}) {
  const [open, setOpen] = useState(false);

  if (diff === 0) return <span className="text-gray-400">–</span>;

  const color = diff > 0 ? "text-green-600" : "text-red-600";
  const label = diff > 0 ? `+${diff}` : `${diff}`;

  if (!added || !removed) {
    return <span className={`${color} font-semibold`}>{label}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${color} font-semibold underline decoration-dotted hover:opacity-80`}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-lg max-w-sm w-full max-h-[70vh] flex flex-col"
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
            <div className="overflow-y-auto px-5 py-3 flex flex-col gap-3">
              {added.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Added ({added.length})</p>
                  <ul className="flex flex-col gap-1">
                    {added.map((name, i) => (
                      <li key={i} className="text-sm text-gray-700">{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {removed.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Removed ({removed.length})</p>
                  <ul className="flex flex-col gap-1">
                    {removed.map((name, i) => (
                      <li key={i} className="text-sm text-gray-700">{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {added.length === 0 && removed.length === 0 && (
                <p className="text-sm text-gray-400">No individual changes recorded for this shift.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

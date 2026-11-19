"use client";

import { useEffect, useRef, useState } from "react";
import { L113StudentQr, downloadL113QrPng } from "@/components/L113StudentQr";
import { matchesNameQuery } from "@/lib/vgLeaderSearch";
import type { L113Student } from "@/lib/l113Data";

const saveButton = "text-xs font-medium text-indigo-600 hover:text-indigo-800 print:hidden";

export function StudentQrGrid({ batchName, students }: { batchName: string; students: L113Student[] }) {
  const [q, setQ] = useState("");
  const [enlarged, setEnlarged] = useState<L113Student | null>(null);
  const enlargedRef = useRef<HTMLDivElement>(null);
  const shown = students.filter((s) => matchesNameQuery(s, q));

  function save(s: L113Student, container: HTMLElement | null) {
    void downloadL113QrPng(container, `${s.firstName} ${s.lastName}`, batchName);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEnlarged(null);
    }
    if (enlarged) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enlarged]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search student by name..."
          className="w-full sm:flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <span className="text-xs text-gray-500 shrink-0">
          {shown.length === students.length ? `${students.length} students` : `${shown.length} of ${students.length} students`}
        </span>
      </div>

      {/* Printing always includes every student, whatever the search. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
        {students.map((s) => (
          <div
            key={s.vgLeaderId}
            className={`flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid ${
              shown.includes(s) ? "" : "hidden print:flex"
            }`}
          >
            <button
              type="button"
              onClick={() => setEnlarged(s)}
              aria-label={`Show ${s.name}'s QR code bigger`}
              className="flex flex-col items-center gap-2 rounded-lg hover:opacity-80 transition"
            >
              <span data-qr className="block">
                <L113StudentQr vgLeaderId={s.vgLeaderId} size={140} />
              </span>
              <span className="text-sm font-semibold text-gray-900 text-center">{s.nickname || s.firstName}</span>
              <span className="text-xs text-gray-500 text-center">{s.name}</span>
              {s.service && <span className="text-[10px] text-gray-400 text-center print:hidden">{s.service}</span>}
              <span className="text-[10px] text-gray-400 hidden print:block">{batchName}</span>
            </button>
            <button
              type="button"
              onClick={(e) => save(s, e.currentTarget.parentElement?.querySelector<HTMLElement>("[data-qr]") ?? null)}
              className={saveButton}
            >
              ⬇ Save image
            </button>
          </div>
        ))}
      </div>
      {shown.length === 0 && <p className="text-sm text-gray-400 print:hidden">No student matches &ldquo;{q}&rdquo;.</p>}

      {enlarged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden" onClick={() => setEnlarged(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div ref={enlargedRef}>
              <L113StudentQr vgLeaderId={enlarged.vgLeaderId} size={280} />
            </div>
            <p className="text-lg font-bold text-gray-900 text-center">{enlarged.name}</p>
            {enlarged.nickname && <p className="text-sm text-gray-500 -mt-2">&ldquo;{enlarged.nickname}&rdquo;</p>}
            <p className="text-xs text-gray-400">{batchName}</p>
            <div className="mt-2 grid w-full grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => save(enlarged, enlargedRef.current)}
                className="w-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              >
                ⬇ Save image
              </button>
              <button
                type="button"
                onClick={() => setEnlarged(null)}
                className="w-full bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

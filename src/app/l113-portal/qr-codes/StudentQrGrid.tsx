"use client";

import { useEffect, useState } from "react";
import { L113StudentQr } from "@/components/L113StudentQr";
import { matchesNameQuery } from "@/lib/vgLeaderSearch";
import type { L113Student } from "@/lib/l113Data";

export function StudentQrGrid({ batchName, students }: { batchName: string; students: L113Student[] }) {
  const [q, setQ] = useState("");
  const [enlarged, setEnlarged] = useState<L113Student | null>(null);
  const shown = students.filter((s) => matchesNameQuery(s, q));

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
        {students.map((s) => {
          const visible = shown.includes(s);
          return (
            <button
              key={s.vgLeaderId}
              type="button"
              onClick={() => setEnlarged(s)}
              className={`flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid hover:border-indigo-400 hover:shadow-md transition ${
                visible ? "" : "hidden print:flex"
              }`}
            >
              <L113StudentQr vgLeaderId={s.vgLeaderId} size={140} />
              <span className="text-sm font-semibold text-gray-900 text-center">{s.nickname || s.firstName}</span>
              <span className="text-xs text-gray-500 text-center">{s.name}</span>
              {s.service && <span className="text-[10px] text-gray-400 text-center print:hidden">{s.service}</span>}
              <span className="text-[10px] text-gray-400 hidden print:block">{batchName}</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && <p className="text-sm text-gray-400 print:hidden">No student matches &ldquo;{q}&rdquo;.</p>}

      {enlarged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden" onClick={() => setEnlarged(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <L113StudentQr vgLeaderId={enlarged.vgLeaderId} size={280} />
            <p className="text-lg font-bold text-gray-900 text-center">{enlarged.name}</p>
            {enlarged.nickname && <p className="text-sm text-gray-500 -mt-2">&ldquo;{enlarged.nickname}&rdquo;</p>}
            <p className="text-xs text-gray-400">{batchName}</p>
            <button
              type="button"
              onClick={() => setEnlarged(null)}
              className="mt-2 w-full bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

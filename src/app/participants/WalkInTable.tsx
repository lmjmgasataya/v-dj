"use client";

import { useState } from "react";
import type { WalkIn } from "@/db/schema";

type WalkInWithSession = WalkIn & { sessionName: string | null };

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value || "—"}</p>
    </div>
  );
}

export function WalkInTable({ rows }: { rows: WalkInWithSession[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      {rows.map((w) => {
        const isExpanded = expandedId === w.id;
        return (
          <div key={w.id}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : w.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {w.lastName}, {w.firstName}{w.middleInitial ? ` ${w.middleInitial}.` : ""}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {w.serviceAttending} · {w.sessionName ?? "Unknown session"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Walk-in
                </span>
                <span className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Detail label="Age" value={w.age} />
                <Detail label="Gender" value={w.gender} />
                <Detail label="Service" value={w.serviceAttending} />
                <Detail label="Facebook / Messenger" value={w.facebookMessengerName} />
                <Detail label="VG Leader" value={`${w.vgLeaderLastName}, ${w.vgLeaderFirstName}`} />
                <Detail label="Victory Date" value={w.victoryDate} />
                <Detail label="Session" value={w.sessionName} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

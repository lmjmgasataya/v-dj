"use client";

import { useState } from "react";
import type { WalkIn } from "@/db/schema";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value || "—"}</p>
    </div>
  );
}

export function WalkInAttendeeList({ walkIns }: { walkIns: WalkIn[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      {walkIns.map((w, i) => {
        const isExpanded = expandedId === w.id;
        const fullName = `${w.lastName}, ${w.firstName}${w.middleInitial ? ` ${w.middleInitial}.` : ""}`;
        const recordedAt = new Date(w.createdAt).toLocaleTimeString("en-PH", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });

        return (
          <div key={w.id}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : w.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono w-5 shrink-0">{i + 1}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {w.serviceAttending} · recorded at {recordedAt}
                  </p>
                </div>
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

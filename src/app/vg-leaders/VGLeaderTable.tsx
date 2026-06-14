"use client";

import { useState } from "react";
import Link from "next/link";
import type { VictoryGroupLeader, VictoryGroup } from "@/db/schema";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

export function VGLeaderTable({
  rows,
  groupsByLeader = {},
}: {
  rows: VictoryGroupLeader[];
  groupsByLeader?: Record<number, VictoryGroup[]>;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      {rows.map((leader) => {
        const isExpanded = expandedId === leader.id;
        const fullName = `${leader.lastName}, ${leader.firstName}${leader.middleInitial ? ` ${leader.middleInitial}.` : ""}`;

        const groups = groupsByLeader[leader.id] ?? [];

        return (
          <div key={leader.id}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : leader.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm capitalize">{fullName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{leader.mobileNumber} · {leader.gender}</p>
              </div>
              <span className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▾</span>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Detail label="Last Name" value={leader.lastName} />
                  <Detail label="First Name" value={leader.firstName} />
                  <Detail label="Middle Initial" value={leader.middleInitial} />
                  <Detail label="Mobile Number" value={leader.mobileNumber} />
                  <Detail label="Age" value={leader.age} />
                  <Detail label="Gender" value={leader.gender} />
                  <Detail label="Lifestage" value={leader.lifestage} />
                  <Detail label="Service Attending" value={leader.serviceAttending} />
                  <Detail label="Facebook / Messenger" value={leader.facebookMessengerName} />
                </div>

                <div className="border-t border-gray-200 pt-3 flex flex-col gap-2">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Victory Groups ({groups.length})
                  </p>
                  {groups.length === 0 ? (
                    <p className="text-sm text-gray-400">No victory groups yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {groups.map((g) => (
                        <li key={g.id} className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg">
                          <span className="font-medium">{g.place}</span>
                          <span className="text-indigo-300">·</span>
                          <span>{g.day}</span>
                          <span className="text-indigo-300">·</span>
                          <span>{g.time}</span>
                          <span className="text-indigo-300">·</span>
                          <span>{g.frequency === "Others" ? (g.otherFrequency ?? "Others") : g.frequency}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-3 flex justify-end">
                  <Link
                    href={`/vg-leaders/${leader.id}/edit`}
                    className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

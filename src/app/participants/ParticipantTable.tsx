"use client";

import { useState } from "react";
import Link from "next/link";
import type { Participant } from "@/db/schema";


function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value || "—"}</p>
    </div>
  );
}

type Attendance = { sessionName: string; sessionDate: string };

export function ParticipantTable({
  rows,
  attendance = {},
}: {
  rows: Participant[];
  attendance?: Record<number, Attendance[]>;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      {rows.map((p) => {
        const isExpanded = expandedId === p.id;

        return (
          <div key={p.id}>
            {/* Row — always visible */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : p.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {p.lastName}, {p.firstName}{p.middleInitial ? ` ${p.middleInitial}.` : ""}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.mobileNumber} · {p.lifestage} · {p.serviceAttending}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  p.registrationFee === "Discounted"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {p.registrationFee}
                </span>
                <span className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Detail label="Age" value={p.age} />
                  <Detail label="Gender" value={p.gender} />
                  <Detail label="Service" value={p.serviceAttending} />
                  <Detail label="Facebook / Messenger" value={p.facebookMessengerName} />
                  <Detail label="Previous Church" value={p.previousChurch} />
                  <Detail label="Preferred ID Name" value={p.preferredNameOnId} />
                  <Detail label="Completed One2One" value={p.completedOne2One ? "Yes" : "No (will complete before Victory Day)"} />
                  <Detail label="Water Baptism" value={p.willUndergoWaterBaptism ? "Yes" : "No"} />
                  <Detail label="Receipt No." value={p.acknowledgementReceiptNumber} />
                </div>

                <div className="border-t border-gray-200 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Detail label="Discipler" value={`${p.disciplerLastName}, ${p.disciplerFirstName}`} />
                  <Detail label="Discipler Mobile" value={p.disciplerMobileNumber} />
                  <Detail label="Discipler Messenger" value={p.disciplerMessengerName} />
                </div>

                {(attendance[p.id]?.length ?? 0) > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
                      Classes Attended ({attendance[p.id].length})
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {attendance[p.id].map((a, i) => (
                        <li key={i} className="inline-flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg w-fit">
                          <span className="font-medium">{a.sessionName}</span>
                          <span className="text-indigo-400">·</span>
                          <span className="text-indigo-500">
                            {new Date(a.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
                              month: "short", day: "numeric", year: "numeric",
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                  <Detail label="Admin Volunteer" value={p.adminVolunteerName} />
                  <Link
                    href={`/participants/${p.id}/edit`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
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

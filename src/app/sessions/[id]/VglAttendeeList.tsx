"use client";

import { useState } from "react";
import { toTitleCase } from "@/lib/text";
import { checkInStatusBadgeClass } from "@/lib/checkinStatus";
import type { CheckInStatus, CheckInMethod } from "@/db/schema";
import { ClaimedCompletedBadge } from "@/app/admin/ClaimedCompletedBadge";

export interface VglAttendee {
  checkInId: number;
  checkedInAt: Date;
  vgLeaderId: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  nickname: string | null;
  mobileNumber: string | null;
  serviceAttending: string | null;
  claimedAndCompleted: boolean;
  remarks: string | null;
  status: CheckInStatus;
  method: CheckInMethod;
}

export function VglAttendeeList({ attendees }: { attendees: VglAttendee[] }) {
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const filtered = query
    ? attendees.filter((a) => {
        const haystack = `${a.lastName} ${a.firstName} ${a.nickname ?? ""} ${a.mobileNumber ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
    : attendees;

  return (
    <div className="flex flex-col gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or mobile number..."
        className="w-full sm:w-80 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      <div className="rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">VG Leader</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Service</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Checked In At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-400">
                    No attendees match &ldquo;{q}&rdquo;.
                  </td>
                </tr>
              ) : (
                filtered.map((a, i) => {
                  const fullName = `${toTitleCase(a.lastName)}, ${toTitleCase(a.firstName)}${a.middleInitial ? ` ${toTitleCase(a.middleInitial)}.` : ""}`;
                  const checkInTime = new Date(a.checkedInAt).toLocaleTimeString("en-PH", {
                    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila",
                  });
                  const subtitle = [a.nickname && `"${a.nickname}"`, a.mobileNumber].filter(Boolean).join(" · ");

                  return (
                    <tr key={a.checkInId}>
                      <td className="px-3 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{fullName}</p>
                          {a.claimedAndCompleted && <ClaimedCompletedBadge />}
                        </div>
                        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                        {a.remarks && <p className="text-xs text-amber-700 italic mt-0.5">{a.remarks}</p>}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{a.serviceAttending ?? "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${checkInStatusBadgeClass(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{checkInTime}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

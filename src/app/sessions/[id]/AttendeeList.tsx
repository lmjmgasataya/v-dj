"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { toTitleCase } from "@/lib/text";

export interface Attendee {
  checkInId: number;
  checkedInAt: Date;
  participantId: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  mobileNumber: string | null;
  facebookMessengerName: string | null;
  lifestage: string | null;
  age: number;
  gender: string;
  serviceAttending: string;
  preferredNameOnId: string | null;
  registrationFee: string | null;
  acknowledgementReceiptNumber: string | null;
  completedOne2One: boolean | null;
  willUndergoWaterBaptism: boolean | null;
  previousChurch: string | null;
  disciplerLastName: string | null;
  disciplerFirstName: string | null;
  disciplerMobileNumber: string | null;
  disciplerMessengerName: string | null;
  isWalkIn: boolean;
  vgLeaderLastName: string | null;
  vgLeaderFirstName: string | null;
  victoryDate: string | null;
  victoryDayDate: string | null;
  completedVictoryDay: boolean;
  remarks: string | null;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

type SortKey = "name" | "checkedInAt" | "victoryDay";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-[#00428E] ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

function Th({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${className ?? ""}`}>
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-0 hover:text-gray-900 transition-colors"
      >
        {label}
        <SortIcon active={active} dir={dir} />
      </button>
    </th>
  );
}

function victoryDayValue(attendee: Attendee): string {
  return (attendee.isWalkIn ? attendee.victoryDate : attendee.victoryDayDate) ?? "";
}

function VictoryDayBadge({ attendee }: { attendee: Attendee }) {
  const vd = attendee.isWalkIn ? attendee.victoryDate : attendee.victoryDayDate;
  if (!vd) return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">—</span>
  );
  if (!attendee.completedVictoryDay) return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      {vd} (Incomplete)
    </span>
  );
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
      {vd}
    </span>
  );
}

export function AttendeeList({ attendees }: { attendees: Attendee[] }) {
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("checkedInAt");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const query = q.trim().toLowerCase();
  const filtered = query
    ? attendees.filter((a) => {
        const fullName = `${a.lastName} ${a.firstName} ${a.middleInitial ?? ""}`.toLowerCase();
        return fullName.includes(query) || (a.mobileNumber ?? "").toLowerCase().includes(query);
      })
    : attendees;

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        break;
      case "checkedInAt":
        cmp = new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
        break;
      case "victoryDay":
        cmp = victoryDayValue(a).localeCompare(victoryDayValue(b));
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

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
                <Th label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Checked In At" sortKey="checkedInAt" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Victory Day" sortKey="victoryDay" current={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-400">
                    No attendees match &ldquo;{q}&rdquo;.
                  </td>
                </tr>
              ) : (
                sorted.map((a, i) => {
                  const isExpanded = expandedId === a.checkInId;
                  const fullName = `${toTitleCase(a.lastName)}, ${toTitleCase(a.firstName)}${a.middleInitial ? ` ${toTitleCase(a.middleInitial)}.` : ""}`;
                  const checkInTime = new Date(a.checkedInAt).toLocaleTimeString("en-PH", {
                    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila",
                  });
                  const subtitle = [a.mobileNumber, a.lifestage].filter(Boolean).join(" · ");

                  return (
                    <Fragment key={a.checkInId}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : a.checkInId)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-gray-900 capitalize">{fullName}</p>
                          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                          {a.remarks && (
                            <p className="text-xs text-amber-700 italic mt-0.5">{a.remarks}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{checkInTime}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <VictoryDayBadge attendee={a} />
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${a.checkInId}-details`}>
                          <td colSpan={4} className="px-4 py-4 bg-gray-50 border-t border-gray-100">
                            <div className="flex flex-col gap-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <Detail label="Age" value={a.age} />
                                <Detail label="Gender" value={a.gender} />
                                <Detail label="Service" value={a.serviceAttending} />
                                <Detail label="Facebook / Messenger" value={a.facebookMessengerName} />
                                {a.isWalkIn ? (
                                  <>
                                    <Detail label="VG Leader" value={
                                      a.vgLeaderLastName && a.vgLeaderFirstName
                                        ? `${toTitleCase(a.vgLeaderLastName)}, ${toTitleCase(a.vgLeaderFirstName)}`
                                        : null
                                    } />
                                    <Detail label="Victory Date" value={a.victoryDate} />
                                  </>
                                ) : (
                                  <>
                                    <Detail label="Preferred ID Name" value={a.preferredNameOnId} />
                                    <Detail label="Previous Church" value={a.previousChurch} />
                                    <Detail label="Completed One2One" value={
                                      a.completedOne2One == null ? null
                                        : a.completedOne2One ? "Yes" : "No (will complete before Victory Day)"
                                    } />
                                    <Detail label="Water Baptism" value={
                                      a.willUndergoWaterBaptism == null ? null
                                        : a.willUndergoWaterBaptism ? "Yes" : "No"
                                    } />
                                    <Detail label="Receipt No." value={a.acknowledgementReceiptNumber} />
                                  </>
                                )}
                              </div>
                              {!a.isWalkIn && (
                                <div className="border-t border-gray-200 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <Detail label="Discipler" value={
                                    a.disciplerLastName && a.disciplerFirstName
                                      ? `${toTitleCase(a.disciplerLastName)}, ${toTitleCase(a.disciplerFirstName)}`
                                      : null
                                  } />
                                  <Detail label="Discipler Mobile" value={a.disciplerMobileNumber} />
                                  <Detail label="Discipler Messenger" value={a.disciplerMessengerName} />
                                </div>
                              )}
                              <div className="border-t border-gray-200 pt-3 flex justify-end">
                                <Link
                                  href={`/participants/${a.participantId}/edit`}
                                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Edit participant →
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

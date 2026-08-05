"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import type { Participant } from "@/db/schema";
import { FEE_CATEGORIES } from "@/components/form";
import { toTitleCase } from "@/lib/text";

type ParticipantRow = Participant & {
  disciplerLastName: string | null;
  disciplerFirstName: string | null;
  disciplerMobileNumber: string | null;
  disciplerMessengerName: string | null;
  vgLeaderLastName: string | null;
  vgLeaderFirstName: string | null;
  vgLeaderMobileNumber: string | null;
  vgLeaderMessengerName: string | null;
};

type Attendance = { sessionName: string; sessionDate: string };

type SortKey = "name" | "lifestage" | "fee" | "gender" | "victoryDay" | "registered";
type SortDir = "asc" | "desc";

function Detail({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-gray-800 mt-0.5 ${className ?? ""}`}>{value ?? "—"}</p>
    </div>
  );
}

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
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
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

export function ParticipantTable({
  rows,
  attendance = {},
  absences = {},
  victoryDayDates = {},
  completedVictoryDays = {},
  victoryDayCounts = {},
  totalVictoryDaySessions = 0,
  showEdit = true,
}: {
  rows: ParticipantRow[];
  attendance?: Record<number, Attendance[]>;
  absences?: Record<number, Attendance[]>;
  victoryDayDates?: Record<number, string>;
  completedVictoryDays?: Record<number, boolean>;
  victoryDayCounts?: Record<number, number>;
  totalVictoryDaySessions?: number;
  showEdit?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("registered");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        break;
      case "lifestage":
        cmp = (a.lifestage ?? "").localeCompare(b.lifestage ?? "");
        break;
      case "fee":
        cmp = (a.registrationFee ?? "").localeCompare(b.registrationFee ?? "");
        break;
      case "gender":
        cmp = (a.gender ?? "").localeCompare(b.gender ?? "");
        break;
      case "victoryDay": {
        const vdA = a.victoryDate ?? victoryDayDates[a.id] ?? "";
        const vdB = b.victoryDate ?? victoryDayDates[b.id] ?? "";
        cmp = vdA.localeCompare(vdB);
        break;
      }
      case "registered":
        cmp = (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const colSpan = showEdit ? 6 : 5;

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <Th label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
              <Th label="Life Stage" sortKey="lifestage" current={sortKey} dir={sortDir} onSort={handleSort} />
              <Th label="Class" sortKey="fee" current={sortKey} dir={sortDir} onSort={handleSort} />
              <Th label="Gender" sortKey="gender" current={sortKey} dir={sortDir} onSort={handleSort} />
              <Th label="Victory Day" sortKey="victoryDay" current={sortKey} dir={sortDir} onSort={handleSort} />
              <Th label="Registered" sortKey="registered" current={sortKey} dir={sortDir} onSort={handleSort} />
              {showEdit && (
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((p) => {
              const isExpanded = expandedId === p.id;
              const feeCat = FEE_CATEGORIES.find((f) => f.value === p.registrationFee);
              const vd = p.victoryDate ?? victoryDayDates[p.id] ?? null;
              const completed = !!p.victoryDate || !!completedVictoryDays[p.id];
              const victoryDayCount = victoryDayCounts[p.id] ?? 0;

              return (
                <Fragment key={p.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <span className="capitalize">
                        {toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}
                        {p.middleInitial ? ` ${toTitleCase(p.middleInitial)}.` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {p.lifestage ?? "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {feeCat ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          Class {feeCat.value}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {p.gender ?? "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {!vd ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : !completed ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          {vd} ({victoryDayCount}/{totalVictoryDaySessions})
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {vd}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: "Asia/Manila",
                          })
                        : "—"}
                    </td>
                    {showEdit && (
                      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/participants/${p.id}/edit`}
                          className="bg-[#00428E] hover:bg-[#003578] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          Edit
                        </Link>
                      </td>
                    )}
                  </tr>

                  {isExpanded && (
                    <tr key={`${p.id}-details`}>
                      <td colSpan={colSpan} className="px-4 py-4 bg-gray-50 border-t border-gray-100">
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <Detail label="Age" value={p.age} />
                            <Detail label="Mobile" value={p.mobileNumber} />
                            <Detail label="Service" value={p.serviceAttending} />
                            <Detail label="Email" value={p.email} />
                            <Detail label="Facebook / Messenger" value={p.facebookMessengerName} />
                            {(p.lifestage === "Student (JHS/SHS)" || p.lifestage === "Student (College)") && (
                              <Detail label="School" value={p.school} />
                            )}
                            <Detail label="Previous Church" value={p.previousChurch} />
                            <Detail label="Preferred ID Name" value={p.preferredNameOnId} />
                            <Detail label="Completed One2One" value={
                              p.completedOne2One == null ? null
                                : p.completedOne2One ? "Yes" : "No (will complete before Victory Day)"
                            } />
                            <Detail label="Water Baptism" value={
                              p.willUndergoWaterBaptism == null ? null
                                : p.willUndergoWaterBaptism ? "Yes" : "No"
                            } />
                            <Detail label="Confirmed Readiness" value={
                              p.confirmedReadiness == null ? null
                                : p.confirmedReadiness ? "Yes" : "No"
                            } />
                            <Detail label="Done with Victory Weekend" value={
                              p.isDoneWithVictoryWeekend ? "Yes" : "No"
                            } />
                            {p.victoryDate && (
                              <Detail label="Victory Weekend Date" value={p.victoryDate} />
                            )}
                          </div>

                          <div className="border-t border-gray-200 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {p.registrationFee === "C" || p.registrationFee === "D" || ((p.registrationFee === "A" || p.registrationFee === "B") && !!p.isDoneWithVictoryWeekend) ? (
                              <>
                                <Detail label="VG Leader" className="capitalize" value={
                                  p.vgLeaderLastName && p.vgLeaderFirstName
                                    ? `${toTitleCase(p.vgLeaderLastName)}, ${toTitleCase(p.vgLeaderFirstName)}`
                                    : null
                                } />
                                <Detail label="VG Leader Mobile" value={p.vgLeaderMobileNumber} />
                                <Detail label="VG Leader Messenger" value={p.vgLeaderMessengerName} />
                              </>
                            ) : (
                              <>
                                <Detail label="Discipler" className="capitalize" value={
                                  p.disciplerLastName && p.disciplerFirstName
                                    ? `${toTitleCase(p.disciplerLastName)}, ${toTitleCase(p.disciplerFirstName)}`
                                    : null
                                } />
                                <Detail label="Discipler Mobile" value={p.disciplerMobileNumber} />
                                <Detail label="Discipler Messenger" value={p.disciplerMessengerName} />
                              </>
                            )}
                          </div>

                          {(attendance[p.id]?.length ?? 0) > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
                                Classes Attended ({attendance[p.id].length})
                              </p>
                              <ul className="flex flex-wrap gap-1.5">
                                {attendance[p.id].map((a, i) => (
                                  <li key={i} className="inline-flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">
                                    <span className="font-medium">{a.sessionName}</span>
                                    <span className="text-indigo-400">·</span>
                                    <span className="text-indigo-500">
                                      {new Date(a.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
                                        month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
                                      })}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(absences[p.id]?.length ?? 0) > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
                                Absent ({absences[p.id].length})
                              </p>
                              <ul className="flex flex-wrap gap-1.5">
                                {absences[p.id].map((a, i) => (
                                  <li key={i} className="inline-flex items-center gap-2 text-sm bg-red-50 text-red-700 px-3 py-1.5 rounded-lg">
                                    <span className="font-medium">{a.sessionName}</span>
                                    <span className="text-red-400">·</span>
                                    <span className="text-red-500">
                                      {new Date(a.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
                                        month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
                                      })}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="border-t border-gray-200 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <Detail label="Admin Volunteer" value={p.adminVolunteerName} />
                            <Detail label="Worship Service Registered" value={p.worshipServiceRegistered} />
                            <Detail label="AR Number" value={p.acknowledgementReceiptNumber} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

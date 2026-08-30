"use client";

import { useState } from "react";
import Link from "next/link";
import { toTitleCase } from "@/lib/text";
import { ParticipantsCell, type ParticipantsCellEntry } from "@/components/ParticipantsCell";
import { resetVgLeaderPin } from "./actions";

export interface VgLeaderRow {
  id: number;
  lastName: string;
  firstName: string;
  nickname: string | null;
  mobileNumber: string | null;
  duplicateMobile: boolean;
  duplicateName: boolean;
  claimed: boolean;
  accountId: number | null;
  profileCompleted: boolean;
  activeGroups: number;
  participants: ParticipantsCellEntry[];
}

const selectCls =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";

type ProfileFilter = "all" | "complete" | "incomplete";

export function VgLeadersTable({ rows }: { rows: VgLeaderRow[] }) {
  const [q, setQ] = useState("");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");

  const query = q.trim().toLowerCase();
  const filtered = rows.filter((l) => {
    if (query) {
      const haystack = `${l.lastName} ${l.firstName} ${l.nickname ?? ""} ${l.mobileNumber ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (profileFilter === "complete" && !l.profileCompleted) return false;
    if (profileFilter === "incomplete" && l.profileCompleted) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 px-6 pt-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, nickname, or mobile number..."
          className="flex-1 min-w-48 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select
          value={profileFilter}
          onChange={(e) => setProfileFilter(e.target.value as ProfileFilter)}
          className={selectCls}
        >
          <option value="all">All Profiles</option>
          <option value="complete">Profile Complete</option>
          <option value="incomplete">Profile Incomplete</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">
          {rows.length === 0 ? "None yet." : "No entries match the current filters."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Mobile</th>
                <th className="px-4 py-2 text-left font-medium">Portal Account</th>
                <th className="px-4 py-2 text-left font-medium">Profile</th>
                <th className="px-4 py-2 text-left font-medium">Active Groups</th>
                <th className="px-4 py-2 text-left font-medium">Participants</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/manage-vg-leaders/leaders/${l.id}`}
                      className="font-medium text-gray-800 hover:text-indigo-700 hover:underline"
                    >
                      {toTitleCase(l.lastName)}, {toTitleCase(l.firstName)}
                      {l.duplicateName && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 align-middle">
                          Duplicate
                        </span>
                      )}
                    </Link>
                    {l.nickname && <p className="text-xs text-gray-400">&quot;{l.nickname}&quot;</p>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <span className={l.duplicateMobile ? "text-red-600 font-semibold" : "text-gray-500"}>
                      {l.mobileNumber ?? "—"}
                    </span>
                    {l.duplicateMobile && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                        Duplicate
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        l.claimed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {l.claimed ? "Claimed" : "Not claimed"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        l.profileCompleted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {l.profileCompleted ? "Complete" : "Incomplete"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{l.activeGroups}</td>
                  <td className="px-4 py-2.5">
                    <ParticipantsCell participants={l.participants} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {l.claimed && l.accountId != null && (
                        <form action={resetVgLeaderPin.bind(null, l.accountId)}>
                          <button
                            type="submit"
                            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                          >
                            Reset PIN
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/manage-vg-leaders/leaders/${l.id}/edit`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

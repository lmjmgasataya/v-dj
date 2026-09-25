"use client";

import { useState } from "react";
import Link from "next/link";
import { toTitleCase } from "@/lib/text";
import { ParticipantsCell, type ParticipantsCellEntry } from "@/components/ParticipantsCell";
import { resetVgLeaderPin } from "./actions";
import { MergeVgLeadersModal } from "./MergeVgLeadersModal";
import { TIME_SERVICES, rawServiceValues, type LeadPastorTimeService } from "@/lib/timeService";

export interface VgLeaderRow {
  id: number;
  lastName: string;
  firstName: string;
  nickname: string | null;
  mobileNumber: string | null;
  serviceAttending: string | null;
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
type SortKey = "name" | "mobile" | "service" | "portal" | "profile" | "groups" | "participants";
type SortDir = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "mobile", label: "Mobile" },
  { key: "service", label: "Service" },
  { key: "portal", label: "Portal Account" },
  { key: "profile", label: "Profile" },
  { key: "groups", label: "Active Groups" },
  { key: "participants", label: "Participants" },
];

function sortValue(l: VgLeaderRow, key: SortKey): string | number {
  switch (key) {
    case "name": return `${l.lastName}, ${l.firstName}`.toLowerCase();
    case "mobile": return l.mobileNumber?.toLowerCase() ?? "";
    case "service": return l.serviceAttending?.toLowerCase() ?? "";
    case "portal": return l.claimed ? 1 : 0;
    case "profile": return l.profileCompleted ? 1 : 0;
    case "groups": return l.activeGroups;
    case "participants": return l.participants.length;
  }
}

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

export function VgLeadersTable({ rows, enableMerge }: { rows: VgLeaderRow[]; enableMerge?: boolean }) {
  const [q, setQ] = useState("");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<number[]>([]);
  const [merging, setMerging] = useState(false);

  function toggleSelected(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  function toggleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  }

  const query = q.trim().toLowerCase();
  const serviceRawValues = serviceFilter ? rawServiceValues(serviceFilter as LeadPastorTimeService) : null;
  const filtered = rows.filter((l) => {
    if (query) {
      const haystack = `${l.lastName} ${l.firstName} ${l.nickname ?? ""} ${l.mobileNumber ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (profileFilter === "complete" && !l.profileCompleted) return false;
    if (profileFilter === "incomplete" && l.profileCompleted) return false;
    if (serviceRawValues && !(l.serviceAttending && serviceRawValues.includes(l.serviceAttending))) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = sortValue(a, sortKey);
    const bv = sortValue(b, sortKey);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
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
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className={selectCls}
        >
          <option value="">All Time Services</option>
          {TIME_SERVICES.map((ts) => (
            <option key={ts} value={ts}>{ts}</option>
          ))}
        </select>
        {enableMerge && selected.length === 2 && (
          <button
            type="button"
            onClick={() => setMerging(true)}
            className="text-xs font-semibold text-white bg-[#00428E] hover:bg-[#003578] px-3 py-1.5 rounded-lg transition"
          >
            Merge Selected (2)
          </button>
        )}
      </div>

      {merging && selected.length === 2 && (
        <MergeVgLeadersModal
          idA={selected[0]}
          idB={selected[1]}
          onClose={() => {
            setMerging(false);
            setSelected([]);
          }}
        />
      )}

      {sorted.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">
          {rows.length === 0 ? "None yet." : "No entries match the current filters."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                {enableMerge && <th className="px-4 py-2 w-8" />}
                {SORT_COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-2 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-0.5 hover:text-gray-800 select-none"
                    >
                      {col.label}
                      <span className={sortKey === col.key ? "text-gray-700" : "text-gray-300"}>
                        {sortIcon(col.key, sortKey, sortDir)}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  {enableMerge && (
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(l.id)}
                        onChange={() => toggleSelected(l.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/vg-leader-portal/leaders/${l.id}`}
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
                  <td className="px-4 py-2.5 text-gray-500">{l.serviceAttending ?? "—"}</td>
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
                        <form
                          action={resetVgLeaderPin.bind(null, l.accountId)}
                          onSubmit={(e) => {
                            const name = `${toTitleCase(l.firstName)} ${toTitleCase(l.lastName)}`;
                            if (
                              !confirm(
                                `Reset the PIN for ${name}?\n\nTheir current PIN will stop working and they'll be asked to set a new one next time they open the portal. Their profile is not affected.`
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                          >
                            Reset PIN
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/vg-leader-portal/leaders/${l.id}/edit`}
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

"use client";

import { useState } from "react";
import { TIME_SERVICES, rawServiceValues, type LeadPastorTimeService } from "@/lib/timeService";

export interface InternRow {
  id: number;
  lastName: string;
  firstName: string;
  place: string;
  day: string;
  time: string;
  leaderLastName: string;
  leaderFirstName: string;
  serviceAttending: string | null;
}

type SortKey = "intern" | "leader" | "place" | "day" | "time" | "service";
type SortDir = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "intern", label: "Intern" },
  { key: "leader", label: "VG Leader" },
  { key: "place", label: "Place" },
  { key: "day", label: "Day" },
  { key: "time", label: "Time" },
  { key: "service", label: "Service" },
];

const selectCls =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";

function sortValue(g: InternRow, key: SortKey): string {
  switch (key) {
    case "intern": return `${g.lastName}, ${g.firstName}`.toLowerCase();
    case "leader": return `${g.leaderLastName}, ${g.leaderFirstName}`.toLowerCase();
    case "place": return g.place.toLowerCase();
    case "day": return g.day.toLowerCase();
    case "time": return g.time.toLowerCase();
    case "service": return g.serviceAttending?.toLowerCase() ?? "";
  }
}

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

export function InternsTable({ rows }: { rows: InternRow[] }) {
  const [serviceFilter, setServiceFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("intern");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  }

  const serviceRawValues = serviceFilter ? rawServiceValues(serviceFilter as LeadPastorTimeService) : null;
  const filtered = rows.filter((g) => {
    if (serviceRawValues && !(g.serviceAttending && serviceRawValues.includes(g.serviceAttending))) return false;
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
      </div>

      {sorted.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">
          {rows.length === 0 ? "No interns recorded yet." : "No entries match the current filters."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-900 font-medium">{g.lastName}, {g.firstName}</td>
                  <td className="px-4 py-2.5 text-gray-700">{g.leaderLastName}, {g.leaderFirstName}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.place}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.day}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.time}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.serviceAttending ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

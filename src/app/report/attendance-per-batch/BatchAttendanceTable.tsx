"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { abbrev, shortSessionDate } from "../sessionLabel";

export interface BatchSession {
  id: number;
  name: string;
  sessionDate: string;
  isVictoryDay: boolean;
}

export interface BatchAttendanceRow {
  id: number;
  name: string;
  service: string;
  skipsVictoryDay: boolean;
  victoryDate: string | null;
  statuses: Record<number, string>;
}

type Completion = "all" | "complete" | "incomplete";

const COMPLETION_OPTIONS: { value: Completion; label: string }[] = [
  { value: "all", label: "All" },
  { value: "complete", label: "Attended all" },
  { value: "incomplete", label: "Incomplete" },
];

function isPresent(status: string | undefined) {
  return status != null && status !== "Absent";
}

function sessionLabel(s: BatchSession) {
  return `${abbrev(s.name)} · ${shortSessionDate(s.sessionDate)}`;
}

function ExcludeSessionsFilter({
  sessions,
  excluded,
  onChange,
}: {
  sessions: BatchSession[];
  excluded: Set<number>;
  onChange: (next: Set<number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(id: number) {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`rounded-lg border px-3 py-2 text-sm text-left transition whitespace-nowrap ${
          excluded.size > 0
            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
            : "border-gray-300 bg-white text-gray-700"
        }`}
      >
        Exclude sessions{excluded.size > 0 ? ` (${excluded.size})` : ""}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 min-w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-h-80 overflow-y-auto">
          {excluded.size > 0 && (
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="w-full text-left px-2 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Clear exclusions
            </button>
          )}
          {sessions.map((s) => (
            <label
              key={s.id}
              title={s.name}
              className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 rounded cursor-pointer whitespace-nowrap"
            >
              <input type="checkbox" checked={excluded.has(s.id)} onChange={() => toggle(s.id)} />
              {sessionLabel(s)}
              {s.isVictoryDay && (
                <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wide">VD</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusCell({ row, session }: { row: BatchAttendanceRow; session: BatchSession }) {
  const status = row.statuses[session.id];
  if (isPresent(status)) {
    return (
      <svg
        className="mx-auto w-4 h-4 text-green-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (status === "Absent") {
    return (
      <span title="Absent" className="inline-flex items-center justify-center cursor-default">
        <svg
          className="w-4 h-4 text-red-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </span>
    );
  }
  if (row.skipsVictoryDay && session.isVictoryDay) {
    return (
      <span title={`Victory Day: ${row.victoryDate ?? "—"}`} className="inline-flex items-center justify-center cursor-default">
        <svg
          className="w-4 h-4 text-gray-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </span>
    );
  }
  return <span className="text-gray-200 text-xs">—</span>;
}

export function BatchAttendanceTable({
  sessions,
  rows,
  serviceOptions,
  batchName,
}: {
  sessions: BatchSession[];
  rows: BatchAttendanceRow[];
  serviceOptions: string[];
  batchName: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [service, setService] = useState("");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [completion, setCompletion] = useState<Completion>("all");
  const [query, setQuery] = useState("");

  const visibleSessions = useMemo(() => sessions.filter((s) => !excluded.has(s.id)), [sessions, excluded]);

  // Attendance is recomputed against only the sessions still shown, so excluding
  // a class immediately changes who counts as having attended everything.
  const computed = useMemo(
    () =>
      rows.map((r) => {
        const applicable = r.skipsVictoryDay ? visibleSessions.filter((s) => !s.isVictoryDay) : visibleSessions;
        const attended = applicable.filter((s) => isPresent(r.statuses[s.id])).length;
        return { row: r, attended, applicable: applicable.length, complete: attended === applicable.length };
      }),
    [rows, visibleSessions]
  );

  // The service filter scopes everything below, including the "attended all" count.
  const inService = service ? computed.filter((c) => c.row.service === service) : computed;
  const completeCount = inService.filter((c) => c.complete).length;

  const q = query.trim().toLowerCase();
  const filtered = inService.filter((c) => {
    if (completion === "complete" && !c.complete) return false;
    if (completion === "incomplete" && c.complete) return false;
    if (q && !c.row.name.toLowerCase().includes(q)) return false;
    return true;
  });

  // Exports exactly what's on screen: current filters, visible session columns only.
  async function handleExport() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const data = filtered.map(({ row, attended, applicable, complete }) => {
        const record: Record<string, string> = { Participant: row.name, Service: row.service };
        for (const s of visibleSessions) {
          const status = row.statuses[s.id];
          record[sessionLabel(s)] = status ?? (row.skipsVictoryDay && s.isVictoryDay ? "Victory Day done" : "");
        }
        record.Total = `${attended}/${applicable}`;
        record["Attended All"] = complete ? "Yes" : "No";
        return record;
      });
      const sheet = XLSX.utils.json_to_sheet(data, {
        header: ["Participant", "Service", ...visibleSessions.map(sessionLabel), "Total", "Attended All"],
      });
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Attendance");
      const parts = [batchName, service, completion !== "all" ? completion : ""].filter(Boolean);
      const fileName = `attendance_${parts.join("_")}`.replace(/[^\w-]+/g, "_");
      XLSX.writeFile(book, `${fileName}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name..."
          className="w-full sm:w-64 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {serviceOptions.length > 1 && (
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              service ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            <option value="">All services</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
          {COMPLETION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCompletion(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                completion === opt.value
                  ? "bg-indigo-50 text-indigo-700 font-medium ring-1 ring-indigo-300"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <ExcludeSessionsFilter sessions={sessions} excluded={excluded} onChange={setExcluded} />
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || filtered.length === 0 || visibleSessions.length === 0}
          className="sm:ml-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? "Exporting…" : `Export (${filtered.length})`}
        </button>
      </div>

      <p className="text-sm text-gray-500">
        <span className="font-semibold text-green-700">{completeCount}</span> of {inService.length}
        {service ? ` in ${service}` : ""} attended all{" "}
        {visibleSessions.length} session{visibleSessions.length !== 1 ? "s" : ""}
        {excluded.size > 0 ? ` (${excluded.size} excluded)` : ""} · showing {filtered.length}
      </p>

      {visibleSessions.length === 0 ? (
        <p className="text-sm text-gray-400">All sessions are excluded.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">No participants match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 border-b-2 border-r-2 border-gray-200 px-4 py-3 text-left font-semibold text-gray-700 min-w-[220px]">
                  Participant
                </th>
                {visibleSessions.map((s) => (
                  <th
                    key={s.id}
                    title={s.name}
                    className="bg-gray-50 border-b-2 border-r border-gray-200 px-3 py-3 text-center font-medium text-gray-600 min-w-[72px]"
                  >
                    <div className="flex flex-col gap-0.5 items-center">
                      <span className="text-xs font-semibold text-gray-700 leading-snug whitespace-nowrap">
                        {abbrev(s.name)}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{shortSessionDate(s.sessionDate)}</span>
                      {s.isVictoryDay && (
                        <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wide">VD</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="bg-gray-50 border-b-2 border-gray-200 px-4 py-3 text-center font-semibold text-gray-700 min-w-[64px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ row, attended, applicable, complete }, i) => {
                const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
                return (
                  <tr key={row.id} className={rowBg}>
                    <td
                      className={`sticky left-0 z-10 ${rowBg} border-r-2 border-b border-gray-100 px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap`}
                    >
                      {row.name}
                      <div className="text-[11px] font-normal text-gray-400">{row.service}</div>
                    </td>
                    {visibleSessions.map((s) => (
                      <td key={s.id} className="border-r border-b border-gray-100 px-3 py-2.5 text-center">
                        <StatusCell row={row} session={s} />
                      </td>
                    ))}
                    <td
                      className={`border-b border-gray-100 px-4 py-2.5 text-center font-semibold whitespace-nowrap ${
                        complete ? "text-green-600" : "text-indigo-600"
                      }`}
                    >
                      {attended}/{applicable}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

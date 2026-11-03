"use client";

import { useState, useTransition, useEffect } from "react";
import { getSessionCheckIns } from "./actions";
import { getVglCheckinRoster } from "./vglActions";
import { toTitleCase } from "@/lib/text";
import { checkInStatusBadgeClass } from "@/lib/checkinStatus";
import { useNewCheckinUi } from "./ui/NewCheckinUi";
import { Sheet } from "./ui/Sheet";
import { StatusPill, Tag } from "./ui/StatusPill";
import { CloseIcon, RefreshIcon, UsersIcon } from "./ui/icons";

type CheckIn = Omit<Awaited<ReturnType<typeof getSessionCheckIns>>[number], "victoryDayDate"> & { victoryDayDate: string | null };

// Shapes VGL check-ins like participant ones so the list below renders both; the
// table / Victory Day badges stay hidden since those fields are left empty.
async function loadVglCheckIns(sessionId: number): Promise<CheckIn[]> {
  const roster = await getVglCheckinRoster(sessionId);
  return roster
    .filter((r) => r.checkInId != null)
    .sort((a, b) => new Date(a.checkedInAt!).getTime() - new Date(b.checkedInAt!).getTime())
    .map((r) => ({
      id: r.checkInId!,
      participantId: r.id,
      lastName: r.lastName,
      firstName: r.firstName,
      middleInitial: r.middleInitial,
      victoryDate: null,
      checkedInAt: r.checkedInAt!,
      remarks: r.checkInRemarks,
      tableNumber: null,
      status: r.checkInStatus!,
      victoryDayDate: null,
      victoryDayCount: 0,
      totalVictoryDaySessions: 0,
      completedVictoryDay: true,
    }));
}

export function SessionAttendeesModal({
  sessionId,
  sessionName,
  attendeeCount,
  vglOnly = false,
}: {
  sessionId: number;
  sessionName: string;
  attendeeCount: number;
  vglOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CheckIn[]>([]);
  const [pending, startTransition] = useTransition();
  const newUi = useNewCheckinUi();

  function load() {
    startTransition(async () => {
      const result = vglOnly ? await loadVglCheckIns(sessionId) : await getSessionCheckIns(sessionId);
      setData(result);
    });
  }

  const attendedCount = data.filter((c) => c.status !== "Absent").length;
  const absentCount = data.length - attendedCount;

  function handleOpen() {
    setOpen(true);
    load();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (newUi) {
    const formatName = (c: CheckIn) => `${toTitleCase(c.lastName)}, ${toTitleCase(c.firstName)}${c.middleInitial ? ` ${toTitleCase(c.middleInitial)}.` : ""}`;
    return (
      <>
        <button
          type="button"
          onClick={handleOpen}
          aria-haspopup="dialog"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-[#00428E] ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00428E]"
        >
          <UsersIcon className="size-4" />
          See list
        </button>

        {open && (
          <Sheet labelledBy={`attendees-${sessionId}`} onClose={() => setOpen(false)} dismissOnBackdrop wide>
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 pt-3 pb-3 sm:pt-4">
              <div className="min-w-0">
                <h3 id={`attendees-${sessionId}`} className="text-lg font-semibold text-gray-900">{sessionName}</h3>
                <p className="text-sm text-gray-600" aria-live="polite">
                  {pending ? (
                    <span className="inline-block h-3.5 w-24 animate-pulse rounded bg-gray-200 align-middle" />
                  ) : (
                    <>
                      <span className="tabular-nums">{attendedCount}</span> checked in
                      {absentCount > 0 && <span className="text-red-700"> · <span className="tabular-nums">{absentCount}</span> absent</span>}
                    </>
                  )}
                </p>
              </div>
              <div className="-mr-2 flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={load}
                  disabled={pending}
                  aria-label="Refresh list"
                  className="flex size-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40"
                >
                  <RefreshIcon className={`size-5 ${pending ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex size-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="min-h-40 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {pending && data.length === 0 ? (
                <div className="divide-y divide-gray-100">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="h-4 w-44 animate-pulse rounded bg-gray-200" />
                      <div className="h-3.5 w-12 animate-pulse rounded bg-gray-100" />
                    </div>
                  ))}
                </div>
              ) : data.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="font-medium text-gray-900">No check-ins yet</p>
                  <p className="mt-1 text-sm text-gray-600">People you check in will show up here.</p>
                </div>
              ) : (
                <ol className="divide-y divide-gray-100">
                  {data.map((c, i) => {
                    const time = new Date(c.checkedInAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
                    const vd = c.victoryDate ?? c.victoryDayDate;
                    const isIncomplete = !!c.victoryDayDate && !c.completedVictoryDay && !c.victoryDate;
                    return (
                      <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                        <span className="w-6 shrink-0 pt-0.5 text-right text-sm text-gray-500 tabular-nums">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 capitalize">{formatName(c)}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <StatusPill status={c.status} />
                            {!vglOnly && <Tag>{c.tableNumber ? `Table ${c.tableNumber}` : "No table"}</Tag>}
                            {vd && <Tag tone={isIncomplete ? "amber" : "gray"}>Victory Day {vd}{isIncomplete ? ` (${c.victoryDayCount}/${c.totalVictoryDaySessions})` : ""}</Tag>}
                          </div>
                          {c.remarks && <p className="mt-1 text-sm text-amber-800">{c.remarks}</p>}
                        </div>
                        <span className="shrink-0 pt-0.5 text-sm text-gray-600 tabular-nums">{time}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </Sheet>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition w-fit shrink-0"
      >
        <span className="text-base font-bold text-indigo-600">{attendeeCount}</span>
        <span className="text-xs text-indigo-500">attendee{attendeeCount !== 1 ? "s" : ""} checked in</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{sessionName}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {pending ? (
                    <span className="inline-block h-3 w-16 rounded bg-gray-200 animate-pulse align-middle" />
                  ) : (
                    <>
                      {attendedCount} checked in
                      {absentCount > 0 && <span className="text-red-500"> · {absentCount} absent</span>}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={load}
                  disabled={pending}
                  className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {pending ? (
                <div className="flex flex-col divide-y divide-gray-100">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start justify-between px-5 py-3 animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="h-3.5 w-4 rounded bg-gray-100 shrink-0 mt-0.5" />
                        <div className="h-4 w-40 rounded bg-gray-200" />
                      </div>
                      <div className="h-3.5 w-10 rounded bg-gray-100 shrink-0 ml-3" />
                    </div>
                  ))}
                </div>
              ) : data.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                  No check-ins yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.map((c, i) => {
                    const name = `${toTitleCase(c.lastName)}, ${toTitleCase(c.firstName)}${c.middleInitial ? ` ${toTitleCase(c.middleInitial)}.` : ""}`;
                    const time = new Date(c.checkedInAt).toLocaleTimeString("en-PH", {
                      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
                    });
                    return (
                      <li key={c.id} className="flex items-start justify-between px-5 py-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-gray-400 font-mono w-5 shrink-0 mt-0.5">{i + 1}</span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900 capitalize">{name}</span>
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${checkInStatusBadgeClass(c.status)}`}>
                                {c.status}
                              </span>
                              {!vglOnly && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${c.tableNumber ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"}`}>
                                  {c.tableNumber ? `Table ${c.tableNumber}` : "No table"}
                                </span>
                              )}
                              {(() => {
                                const vd = c.victoryDate ?? c.victoryDayDate;
                                if (!vd) return null;
                                const isIncomplete = !!c.victoryDayDate && !c.completedVictoryDay && !c.victoryDate;
                                return (
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isIncomplete ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                                    Victory Day: {vd}{isIncomplete ? ` (${c.victoryDayCount}/${c.totalVictoryDaySessions})` : ""}
                                  </span>
                                );
                              })()}
                            </div>
                            {c.remarks && (
                              <p className="text-xs text-amber-700 italic mt-0.5">{c.remarks}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-3 mt-0.5">{time}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useTransition, useEffect } from "react";
import { getSessionCheckIns } from "./actions";

type CheckIn = Awaited<ReturnType<typeof getSessionCheckIns>>[number];

export function SessionAttendeesModal({
  sessionId,
  sessionName,
  attendeeCount,
}: {
  sessionId: number;
  sessionName: string;
  attendeeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CheckIn[]>([]);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await getSessionCheckIns(sessionId);
      setData(result);
    });
  }

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

  return (
    <>
      <button
        onClick={handleOpen}
        className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition w-fit"
      >
        <span className="text-2xl font-bold text-indigo-600">{attendeeCount}</span>
        <span className="text-sm text-indigo-500">attendee{attendeeCount !== 1 ? "s" : ""} checked in</span>
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
                  {pending ? <span className="inline-block h-3 w-16 rounded bg-gray-200 animate-pulse align-middle" /> : `${data.length} checked in`}
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
                    const name = `${c.lastName}, ${c.firstName}${c.middleInitial ? ` ${c.middleInitial}.` : ""}`;
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
                              {(() => {
                                const vd = c.victoryDate ?? c.victoryDayDate;
                                if (!vd) return null;
                                const isIncomplete = !!c.victoryDayDate && !c.completedVictoryDay && !c.victoryDate;
                                return (
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isIncomplete ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                                    Victory Day: {vd}{isIncomplete ? " (Incomplete)" : ""}
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

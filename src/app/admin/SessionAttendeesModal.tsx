"use client";

import { useState, useTransition, useEffect } from "react";
import { getSessionCheckIns } from "./actions";

type CheckIn = Awaited<ReturnType<typeof getSessionCheckIns>>[number];

export function SessionAttendeesModal({
  sessionId,
  sessionName,
}: {
  sessionId: number;
  sessionName: string;
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
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2"
      >
        View attendees
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
                  {pending ? "Loading…" : `${data.length} checked in`}
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
                <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                  Loading…
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
                      hour: "2-digit", minute: "2-digit",
                    });
                    return (
                      <li key={c.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 font-mono w-5 shrink-0">{i + 1}</span>
                          <span className="text-sm font-medium text-gray-900">{name}</span>
                          {c.isWalkIn && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                              Walk-in
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-3">{time}</span>
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

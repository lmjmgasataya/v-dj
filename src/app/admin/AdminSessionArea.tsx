"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useRef, useEffect } from "react";
import type { ClassSession } from "@/db/schema";
import { SessionAttendeesModal } from "./SessionAttendeesModal";

function StepSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 animate-pulse flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
        <div className="h-4 bg-gray-200 rounded w-52" />
      </div>
      <div className="h-10 bg-gray-200 rounded-lg" />
      <div className="flex flex-col gap-2.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function AdminSessionArea({
  sessions,
  selectedId,
  batchName,
  attendeeInfo,
  children,
}: {
  sessions: ClassSession[];
  selectedId: number | null;
  batchName?: string;
  attendeeInfo: { sessionId: number; sessionName: string; attendeeCount: number } | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const currentParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  function formatOption(s: ClassSession) {
    const dateStr = new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
    });
    return `${s.name} — ${dateStr}${s.isVictoryDay ? " (Victory Day)" : ""}`;
  }

  function handleSelect(id: number | null) {
    setOpen(false);
    const params = new URLSearchParams(currentParams.toString());
    if (id) params.set("session", String(id));
    else params.delete("session");
    startTransition(() => router.push(`/admin?${params.toString()}`));
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <>
      {/* Step 1: Select session */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00428E] text-white text-xs font-bold shrink-0">1</span>
          <p className="text-sm font-semibold text-gray-700">
            Select a Session{batchName ? <span className="font-normal text-gray-400"> ({batchName})</span> : null}
          </p>
        </div>

        <div ref={containerRef} className="relative">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-left"
          >
            <span className={selectedSession ? "text-gray-900" : "text-gray-400"}>
              {selectedSession ? formatOption(selectedSession) : "-- Select a session --"}
            </span>
            {isPending ? (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0 ml-2" />
            ) : (
              <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {open && (
            <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              <li
                onClick={() => handleSelect(null)}
                className="px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
              >
                -- Select a session --
              </li>
              {sessions.map((s) => (
                <li
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 ${
                    s.id === selectedId ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-900"
                  }`}
                >
                  {formatOption(s)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {attendeeInfo && !isPending && (
          <SessionAttendeesModal
            sessionId={attendeeInfo.sessionId}
            sessionName={attendeeInfo.sessionName}
            attendeeCount={attendeeInfo.attendeeCount}
          />
        )}
      </div>

      {/* Below Step 1: skeleton while navigating, children when settled */}
      {isPending ? <StepSkeleton /> : children}
    </>
  );
}

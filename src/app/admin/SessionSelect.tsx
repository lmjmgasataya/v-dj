"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useRef, useEffect } from "react";
import type { ClassSession } from "@/db/schema";

export function SessionSelect({
  sessions,
  selectedId,
}: {
  sessions: ClassSession[];
  selectedId: number | null;
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
    if (id) {
      params.set("session", String(id));
    } else {
      params.delete("session");
    }
    startTransition(() => {
      router.push(`/admin?${params.toString()}`);
    });
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
  );
}

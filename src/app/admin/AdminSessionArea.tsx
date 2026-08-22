"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import type { ClassSession } from "@/db/schema";
import { SessionAttendeesModal } from "./SessionAttendeesModal";
import { ParticipantSearch } from "./ParticipantSearch";
import { WalkInForm } from "./WalkInForm";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

export function AdminSessionArea({
  sessions,
  initialSelectedId,
  batchName,
  attendeeCounts,
  initialQ,
  qrCheckin,
  victoryDayAllowAllClasses,
  autoOpenQrScanner,
  confirmBeforeCheckIn,
  showTableNumber,
  autoCheckin,
  autoCheckin915,
  offlineCheckin,
  newDatePicker,
}: {
  sessions: ClassSession[];
  initialSelectedId: number | null;
  batchName?: string;
  attendeeCounts: Record<number, number>;
  initialQ?: string;
  qrCheckin?: boolean;
  victoryDayAllowAllClasses?: boolean;
  autoOpenQrScanner?: boolean;
  confirmBeforeCheckIn?: boolean;
  showTableNumber?: boolean;
  autoCheckin?: boolean;
  autoCheckin915?: boolean;
  offlineCheckin?: boolean;
  newDatePicker?: boolean;
}) {
  const router = useRouter();
  const currentParams = useSearchParams();
  const [open, setOpen] = useState(false);
  // Owned client-side (not derived from the URL) so picking a session never
  // needs a server round trip — required for it to keep working offline.
  // The URL is still kept in sync as a nice-to-have (deep links, refresh)
  // whenever we're actually online to do so.
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);
  const containerRef = useRef<HTMLDivElement>(null);
  const onlineStatus = useOnlineStatus();
  const isOnline = !offlineCheckin || onlineStatus;

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  function formatOption(s: ClassSession) {
    const dateStr = new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
    });
    return `${s.name} — ${dateStr}${s.isVictoryDay ? " (Victory Day)" : ""}`;
  }

  function handleSelect(id: number | null) {
    setOpen(false);
    setSelectedId(id);
    if (isOnline) {
      const params = new URLSearchParams(currentParams.toString());
      if (id) params.set("session", String(id));
      else params.delete("session");
      router.replace(`/admin?${params.toString()}`, { scroll: false });
    }
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00428E] text-white text-xs font-bold shrink-0">1</span>
            <p className="text-sm font-semibold text-gray-700">
              Select a Session{batchName ? <span className="font-normal text-gray-400"> ({batchName})</span> : null}
            </p>
          </div>

          {selectedSession && (
            <SessionAttendeesModal
              sessionId={selectedSession.id}
              sessionName={selectedSession.name}
              attendeeCount={attendeeCounts[selectedSession.id] ?? 0}
            />
          )}
        </div>

        <div ref={containerRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-left"
          >
            <span className={selectedSession ? "text-gray-900" : "text-gray-400"}>
              {selectedSession ? formatOption(selectedSession) : "-- Select a session --"}
            </span>
            <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
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
      </div>

      {/* Step 2: Search participant */}
      {selectedSession && !selectedSession.allowsWalkIn && (
        <div id="search-participant" className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00428E] text-white text-xs font-bold shrink-0">2</span>
            <p className="text-sm font-semibold text-gray-700">
              Search Participant —{" "}
              <span className="text-indigo-600 font-medium">{selectedSession.name}</span>
            </p>
          </div>
          <ParticipantSearch
            key={selectedSession.id}
            sessionId={selectedSession.id}
            sessionName={selectedSession.name}
            isVictoryDay={selectedSession.isVictoryDay}
            requiresVictoryDay={selectedSession.requiresVictoryDay}
            initialQ={selectedSession.id === initialSelectedId ? initialQ : undefined}
            qrCheckin={qrCheckin}
            victoryDayAllowAllClasses={victoryDayAllowAllClasses}
            autoOpenQrScanner={autoOpenQrScanner}
            confirmBeforeCheckIn={confirmBeforeCheckIn}
            showTableNumber={showTableNumber}
            autoCheckin={autoCheckin}
            autoCheckin915={autoCheckin915}
            offlineCheckin={offlineCheckin}
          />
        </div>
      )}

      {/* Step 2: Add walk-in */}
      {selectedSession && selectedSession.allowsWalkIn && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00428E] text-white text-xs font-bold shrink-0">2.1</span>
            <p className="text-sm font-semibold text-gray-700">
              Add Walk-in —{" "}
              <span className="text-indigo-600 font-medium">{selectedSession.name}</span>
            </p>
          </div>
          <WalkInForm sessionId={selectedSession.id} newDatePicker={newDatePicker ?? false} offlineCheckin={offlineCheckin} />
        </div>
      )}
    </>
  );
}

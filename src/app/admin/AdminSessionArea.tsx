"use client";

import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ClassSession } from "@/db/schema";
import { SessionAttendeesModal } from "./SessionAttendeesModal";
import { ParticipantSearch } from "./ParticipantSearch";
import { WalkInForm } from "./WalkInForm";
import { VglCheckIn } from "./VglCheckIn";
import { useNewCheckinUi } from "./ui/NewCheckinUi";
import { SessionPickerSheet, SessionTags, formatSessionDate } from "./ui/SessionPickerSheet";
import { ChevronDownIcon } from "./ui/icons";
import { Tag } from "./ui/StatusPill";
import { SetAttendeeCountProvider } from "./AttendeeCounts";

export function AdminSessionArea({
  sessions,
  initialSelectedId,
  batchName,
  attendeeCounts: serverAttendeeCounts,
  initialQ,
  qrCheckin,
  victoryDayAllowAllClasses,
  autoOpenQrScanner,
  confirmBeforeCheckIn,
  showTableNumber,
  autoCheckin,
  autoCheckin915,
  offlineCheckin,
  checkinTimeoutFallback,
  newDatePicker,
  registeredCount,
  classBreakdown = [],
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
  checkinTimeoutFallback?: boolean;
  newDatePicker?: boolean;
  /** New UI only: registered participants in the batch, total and per class. */
  registeredCount?: number;
  classBreakdown?: { label: string; total: number }[];
}) {
  const newUi = useNewCheckinUi();
  const currentParams = useSearchParams();
  const [open, setOpen] = useState(false);
  // Owned client-side (not derived from the URL) so picking a session never
  // needs a server round trip — required for it to keep working offline.
  // The URL is still kept in sync as a nice-to-have (deep links, refresh),
  // via the native History API rather than router.replace() — a real Next.js
  // navigation fetches fresh RSC data, and when that fetch fails (offline, or
  // navigator.onLine hasn't caught up yet) the router can fall back to a full
  // page reload, which is exactly what this is meant to avoid.
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);
  const containerRef = useRef<HTMLDivElement>(null);
  // Check-ins report the new count (see AttendeeCounts) rather than re-rendering the page; a
  // server render that does happen (e.g. after a settings change) brings fresh counts again.
  const [attendeeCounts, setAttendeeCounts] = useState(serverAttendeeCounts);
  const [lastServerCounts, setLastServerCounts] = useState(serverAttendeeCounts);
  if (serverAttendeeCounts !== lastServerCounts) {
    setLastServerCounts(serverAttendeeCounts);
    setAttendeeCounts(serverAttendeeCounts);
  }
  const setAttendeeCount = useCallback(
    (sessionId: number, count: number) => setAttendeeCounts((counts) => ({ ...counts, [sessionId]: count })),
    []
  );

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  function formatOption(s: ClassSession) {
    const dateStr = new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
    });
    return `${s.name} — ${dateStr}${s.isVictoryDay ? " (Victory Day)" : ""}${s.vglOnly ? " (VGLs only)" : ""}`;
  }

  function handleSelect(id: number | null) {
    setOpen(false);
    setSelectedId(id);
    const params = new URLSearchParams(currentParams.toString());
    if (id) params.set("session", String(id));
    else params.delete("session");
    window.history.replaceState(null, "", `/admin?${params.toString()}`);
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

  if (newUi) {
    const checkedIn = selectedSession ? attendeeCounts[selectedSession.id] ?? 0 : 0;
    // The batch's registered count only means something next to a regular class's roster.
    const showRegistered = !!selectedSession && !selectedSession.vglOnly && !selectedSession.allowsWalkIn && registeredCount != null;
    return (
      <SetAttendeeCountProvider value={setAttendeeCount}>
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-gray-200">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#00428E]"
          >
            <span className="min-w-0 flex-1">
              {selectedSession ? (
                <>
                  <span className="block text-lg leading-snug font-semibold text-gray-900">{selectedSession.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                    {formatSessionDate(selectedSession)}
                    <SessionTags session={selectedSession} />
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-lg leading-snug font-semibold text-gray-900">Choose a session</span>
                  <span className="block text-sm text-gray-600">Pick the class you&rsquo;re checking people in for.</span>
                </>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#00428E]">
              {selectedSession && "Change"}
              <ChevronDownIcon className="size-5" />
            </span>
          </button>

          {selectedSession && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm text-gray-600">
                  <span className="mr-1.5 text-2xl leading-none font-semibold text-gray-900 tabular-nums">{checkedIn}</span>
                  checked in
                </p>
                {showRegistered && (
                  <p className="mt-0.5 text-xs text-gray-600">
                    of <span className="tabular-nums">{registeredCount}</span> registered in the batch
                  </p>
                )}
              </div>
              <SessionAttendeesModal
                sessionId={selectedSession.id}
                sessionName={selectedSession.name}
                attendeeCount={checkedIn}
                vglOnly={selectedSession.vglOnly}
              />
            </div>
          )}

          {showRegistered && classBreakdown.length > 0 && (
            <details className="group border-t border-gray-100 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-gray-600 hover:text-gray-900 [&::-webkit-details-marker]:hidden">
                Registered by class{batchName ? ` in ${batchName}` : ""}
                <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="px-4 pb-3">
                {classBreakdown.map(({ label, total }) => (
                  <li key={label} className="flex justify-between gap-3 py-1 text-gray-700">
                    <span>{label}</span>
                    <span className="font-medium text-gray-900 tabular-nums">{total}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {selectedSession && selectedSession.vglOnly && (
          <section id="search-participant" className="flex scroll-mt-4 flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <h3 className="text-base font-semibold text-gray-900">Check in VG leaders</h3>
              <Tag tone="amber">Active VGLs only</Tag>
            </div>
            <VglCheckIn
              key={selectedSession.id}
              sessionId={selectedSession.id}
              sessionName={selectedSession.name}
              confirmBeforeCheckIn={confirmBeforeCheckIn}
            />
          </section>
        )}

        {selectedSession && !selectedSession.vglOnly && !selectedSession.allowsWalkIn && (
          <section id="search-participant" aria-label={`Check in for ${selectedSession.name}`} className="scroll-mt-4">
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
              checkinTimeoutFallback={checkinTimeoutFallback}
            />
          </section>
        )}

        {selectedSession && !selectedSession.vglOnly && selectedSession.allowsWalkIn && (
          <section className="flex flex-col gap-3">
            <h3 className="px-1 text-base font-semibold text-gray-900">Add a walk-in</h3>
            <WalkInForm sessionId={selectedSession.id} newDatePicker={newDatePicker ?? false} offlineCheckin={offlineCheckin} />
          </section>
        )}

        {open && (
          <SessionPickerSheet
            sessions={sessions}
            selectedId={selectedId}
            batchName={batchName}
            attendeeCounts={attendeeCounts}
            onSelect={handleSelect}
            onClose={() => setOpen(false)}
          />
        )}
      </SetAttendeeCountProvider>
    );
  }

  return (
    <SetAttendeeCountProvider value={setAttendeeCount}>
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
              vglOnly={selectedSession.vglOnly}
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

      {/* Step 2: Check in VG leader (VGL-only session) */}
      {selectedSession && selectedSession.vglOnly && (
        <div id="search-participant" className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00428E] text-white text-xs font-bold shrink-0">2</span>
            <p className="text-sm font-semibold text-gray-700">
              Search VG Leader —{" "}
              <span className="text-indigo-600 font-medium">{selectedSession.name}</span>
              <span className="ml-2 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Active VGLs only</span>
            </p>
          </div>
          <VglCheckIn
            key={selectedSession.id}
            sessionId={selectedSession.id}
            sessionName={selectedSession.name}
            confirmBeforeCheckIn={confirmBeforeCheckIn}
          />
        </div>
      )}

      {/* Step 2: Search participant */}
      {selectedSession && !selectedSession.vglOnly && !selectedSession.allowsWalkIn && (
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
            checkinTimeoutFallback={checkinTimeoutFallback}
          />
        </div>
      )}

      {/* Step 2: Add walk-in */}
      {selectedSession && !selectedSession.vglOnly && selectedSession.allowsWalkIn && (
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
    </SetAttendeeCountProvider>
  );
}

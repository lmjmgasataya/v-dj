"use client";

import { useState, useEffect, useRef } from "react";
import { searchParticipants, getCheckinRoster, type CheckinRosterEntry } from "./actions";
import { SessionCheckInList } from "./SessionCheckInList";
import { QrScanner, QR_PREFIX, type QrScannerHandle } from "./QrScanner";
import { ORIENTATION_SESSION_NAME } from "@/lib/constants";
import { saveRosterSnapshot, loadRosterSnapshot } from "@/lib/offlineStore";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { useNewCheckinUi } from "./ui/NewCheckinUi";
import { Notice } from "./ui/ConfirmCheckInSheet";
import { SearchIcon, Spinner } from "./ui/icons";

type Results = CheckinRosterEntry[];

function filterRoster(roster: Map<number, CheckinRosterEntry>, query: string): CheckinRosterEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return Array.from(roster.values())
    .filter(
      (p) =>
        p.lastName.toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q) ||
        (p.mobileNumber ?? "").toLowerCase().includes(q)
    )
    .sort((a, b) => a.lastName.localeCompare(b.lastName))
    .slice(0, 30);
}

function isScannedCode(text: string): boolean {
  return text.startsWith(QR_PREFIX) && /^\d+$/.test(text.slice(QR_PREFIX.length));
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-3.5 w-44 rounded bg-gray-200" />
        <div className="h-3 w-32 rounded bg-gray-100" />
        <div className="h-5 w-28 rounded-full bg-gray-100" />
      </div>
      <div className="h-7 w-20 rounded-lg bg-gray-200 shrink-0" />
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-3 w-16 rounded bg-gray-200 animate-pulse mb-1" />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}

export function ParticipantSearch({ sessionId, sessionName, isVictoryDay, requiresVictoryDay, initialQ, qrCheckin, victoryDayAllowAllClasses, autoOpenQrScanner, confirmBeforeCheckIn, showTableNumber, autoCheckin, autoCheckin915, offlineCheckin, checkinTimeoutFallback }: { sessionId: number; sessionName: string; isVictoryDay: boolean; requiresVictoryDay: boolean; initialQ?: string; qrCheckin?: boolean; victoryDayAllowAllClasses?: boolean; autoOpenQrScanner?: boolean; confirmBeforeCheckIn?: boolean; showTableNumber?: boolean; autoCheckin?: boolean; autoCheckin915?: boolean; offlineCheckin?: boolean; checkinTimeoutFallback?: boolean }) {
  const isOrientation = sessionName === ORIENTATION_SESSION_NAME;
  const [q, setQ] = useState(initialQ ?? "");
  const [committedQuery, setCommittedQuery] = useState("");
  const [fallbackResults, setFallbackResults] = useState<Results>([]);
  const [searched, setSearched] = useState(false);
  const [pending, setPending] = useState(false);
  const [roster, setRoster] = useState<Map<number, CheckinRosterEntry>>(new Map());
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [searchUnavailableOffline, setSearchUnavailableOffline] = useState(false);
  const onlineStatus = useOnlineStatus();
  const isOnline = !offlineCheckin || onlineStatus;
  const newUi = useNewCheckinUi();
  // Once the roster's loaded, results are derived from it live — so a check-in
  // (via QR or the list below) is reflected immediately, with no re-fetch race.
  const results = rosterLoaded ? filterRoster(roster, committedQuery) : fallbackResults;
  const scrollAfterSearch = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qrScannerRef = useRef<QrScannerHandle>(null);

  function updateRoster(participantId: number, patch: Partial<CheckinRosterEntry>) {
    setRoster((prev) => {
      const existing = prev.get(participantId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(participantId, { ...existing, ...patch });
      return next;
    });
  }

  useEffect(() => {
    if (scrollAfterSearch.current && !pending) {
      scrollAfterSearch.current = false;
      document.getElementById("search-participant")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pending]);

  function runSearch(query: string) {
    setSearched(true);
    scrollAfterSearch.current = true;
    setCommittedQuery(query);
    setSearchUnavailableOffline(false);

    // Once the roster's loaded, results are derived from it — nothing to fetch.
    if (rosterLoaded) {
      setPending(false);
      return;
    }

    setPending(true);
    searchParticipants(sessionId, query, isVictoryDay, victoryDayAllowAllClasses, isOrientation)
      .then((data) => {
        setFallbackResults(data.map((r) => ({ ...r, alreadyCheckedIn: r.checkInId != null, victoryDayBlockReason: null })));
        setPending(false);
      })
      .catch(() => {
        // Offline and the roster never finished preloading for this session
        // (e.g. it's the first time this device has opened this session) —
        // fall back to whatever roster snapshot was last cached, if any.
        if (offlineCheckin) {
          const cached = loadRosterSnapshot(sessionId);
          if (cached.length > 0) {
            setRoster(new Map(cached.map((r) => [r.id, r])));
            setRosterLoaded(true);
            setPending(false);
            return;
          }
        }
        setFallbackResults([]);
        setSearchUnavailableOffline(true);
        setPending(false);
      });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // The hardware QR scanner "types" into whatever's focused — if that
    // happened to be this search box, treat it as a scan instead of a name search.
    if (isScannedCode(trimmed)) {
      setQ("");
      setSearched(false);
      setCommittedQuery("");
      setFallbackResults([]);
      qrScannerRef.current?.scan(trimmed);
      return;
    }

    runSearch(q);
  }

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!q.trim()) return;
    // Don't auto-search mid-scan — wait for the scanner's Enter keystroke
    // to reach handleSubmit, which handles the "dj:participant:" case.
    if (q.trim().startsWith(QR_PREFIX)) return;

    // Once the roster's preloaded, search is just an in-memory filter — no
    // need to debounce a fetch that isn't happening, so run it immediately.
    if (rosterLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      runSearch(q);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      runSearch(q);
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, rosterLoaded]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialQ?.trim()) runSearch(initialQ);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Preload the session roster once so both QR scans and manual name search
  // can resolve instantly from memory instead of round-tripping to the
  // server per scan / per keystroke.
  useEffect(() => {
    let cancelled = false;
    getCheckinRoster(sessionId, isVictoryDay, requiresVictoryDay, victoryDayAllowAllClasses, isOrientation)
      .then((rows) => {
        if (cancelled) return;
        setRoster(new Map(rows.map((r) => [r.id, r])));
        setRosterLoaded(true);
        if (offlineCheckin) saveRosterSnapshot(sessionId, rows);
      })
      .catch(() => {
        if (cancelled || !offlineCheckin) return;
        const cached = loadRosterSnapshot(sessionId);
        if (cached.length > 0) {
          setRoster(new Map(cached.map((r) => [r.id, r])));
          setRosterLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const qrScanner = qrCheckin && (
    <QrScanner
      ref={qrScannerRef}
      sessionId={sessionId}
      isVictoryDay={isVictoryDay}
      allowAllClasses={victoryDayAllowAllClasses}
      isOrientation={isOrientation}
      autoOpen={autoOpenQrScanner && !initialQ?.trim()}
      confirmBeforeCheckIn={confirmBeforeCheckIn}
      showTableNumber={showTableNumber}
      autoCheckin={autoCheckin}
      autoCheckin915={autoCheckin915}
      offlineCheckin={offlineCheckin}
      checkinTimeoutFallback={checkinTimeoutFallback}
      roster={roster}
      onRosterUpdate={updateRoster}
      onCheckIn={(info) => {
        const nextQuery = info.lastName.trim() || q;
        setQ(nextQuery);
        runSearch(nextQuery);
      }}
    />
  );

  const resultsList = (
    <SessionCheckInList
      participants={results}
      sessionId={sessionId}
      isVictoryDay={isVictoryDay}
      requiresVictoryDay={requiresVictoryDay}
      onAction={() => runSearch(q)}
      onRosterUpdate={updateRoster}
      searchQuery={q.trim()}
      confirmBeforeCheckIn={confirmBeforeCheckIn}
      showTableNumber={showTableNumber}
      offlineCheckin={offlineCheckin}
      checkinTimeoutFallback={checkinTimeoutFallback}
      autoCheckin={autoCheckin}
      autoCheckin915={autoCheckin915}
    />
  );

  if (newUi) {
    return (
      <div className="flex flex-col gap-3">
        {qrScanner}
        <form onSubmit={handleSubmit} role="search" className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search by name or mobile number</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={q}
              onChange={(e) => {
                const val = e.target.value;
                setQ(val);
                if (!val.trim()) { setSearched(false); setCommittedQuery(""); setFallbackResults([]); }
              }}
              placeholder="Name or mobile number"
              className="h-12 w-full rounded-xl border border-gray-300 bg-white pr-3 pl-11 text-base text-gray-900 placeholder:text-gray-500 focus:border-[#00428E] focus:outline-none focus:ring-2 focus:ring-[#00428E]/20"
            />
          </label>
          {!rosterLoaded && (
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00428E] disabled:opacity-50"
            >
              {pending && <Spinner className="size-4" />}
              Search
            </button>
          )}
        </form>

        {!isOnline && !rosterLoaded && (
          <Notice tone="warn">No offline participant list for this session yet. Connect once while online to search offline.</Notice>
        )}

        {searched && (
          pending && results.length === 0 ? (
            <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200" aria-busy="true" aria-label="Searching">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-44 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-11 w-24 animate-pulse rounded-xl bg-gray-100" />
                </div>
              ))}
            </div>
          ) : searchUnavailableOffline ? (
            <Notice tone="warn">Can&rsquo;t search offline. There&rsquo;s no saved participant list for this session.</Notice>
          ) : results.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-6 text-center ring-1 ring-gray-200">
              <p className="font-medium text-gray-900">No one found for &ldquo;{q.trim()}&rdquo;</p>
              <p className="mt-1 text-sm text-gray-600">Try their last name or mobile number.</p>
            </div>
          ) : (
            resultsList
          )
        )}
      </div>
    );
  }

  return (
    <div>
      {qrCheckin && (
        <>
          {qrScanner}
          <div className="relative flex items-center my-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-3 text-xs text-gray-400">or search manually</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>
        </>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => {
            const val = e.target.value;
            setQ(val);
            if (!val.trim()) { setSearched(false); setCommittedQuery(""); setFallbackResults([]); }
          }}
          placeholder="Search by name or mobile number..."
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
        >
          {pending ? "Searching..." : "Search"}
        </button>
      </form>

      {!isOnline && !rosterLoaded && (
        <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No offline participant list cached for this session yet — connect once while online to enable offline search.
        </p>
      )}

      {searched && (
        <div className="mt-4">
          {pending && results.length === 0 ? (
            <SearchSkeleton />
          ) : searchUnavailableOffline ? (
            <p className="text-sm text-amber-700">Can&rsquo;t search offline — no cached participant list for this session.</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500">No participants found for &ldquo;{q}&rdquo;.</p>
          ) : (
            resultsList
          )}
        </div>
      )}
    </div>
  );
}

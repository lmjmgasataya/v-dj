"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchParticipants } from "./actions";
import { SessionCheckInList } from "./SessionCheckInList";
import { QrScanner } from "./QrScanner";
import { ORIENTATION_SESSION_NAME } from "@/lib/constants";

type Results = Awaited<ReturnType<typeof searchParticipants>>;

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

export function ParticipantSearch({ sessionId, sessionName, isVictoryDay, requiresVictoryDay, initialQ, qrCheckin, victoryDayAllowAllClasses, autoOpenQrScanner }: { sessionId: number; sessionName: string; isVictoryDay: boolean; requiresVictoryDay: boolean; initialQ?: string; qrCheckin?: boolean; victoryDayAllowAllClasses?: boolean; autoOpenQrScanner?: boolean }) {
  const isOrientation = sessionName === ORIENTATION_SESSION_NAME;
  const [q, setQ] = useState(initialQ ?? "");
  const [results, setResults] = useState<Results>([]);
  const [searched, setSearched] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollAfterSearch = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (scrollAfterSearch.current && !pending) {
      scrollAfterSearch.current = false;
      document.getElementById("search-participant")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pending]);

  function runSearch(query: string) {
    setSearched(true);
    scrollAfterSearch.current = true;
    setPending(true);
    searchParticipants(sessionId, query, isVictoryDay, victoryDayAllowAllClasses, isOrientation).then((data) => {
      setResults(data);
      setPending(false);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", q.trim());
    router.replace(`/admin?${params.toString()}`, { scroll: false });
    runSearch(q);
  }

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!q.trim()) return;

    debounceTimer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", q.trim());
      router.replace(`/admin?${params.toString()}`, { scroll: false });
      runSearch(q);
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialQ?.trim()) runSearch(initialQ);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div>
      {qrCheckin && (
        <>
          <QrScanner
            sessionId={sessionId}
            isVictoryDay={isVictoryDay}
            allowAllClasses={victoryDayAllowAllClasses}
            isOrientation={isOrientation}
            autoOpen={autoOpenQrScanner && !initialQ?.trim()}
            onCheckIn={(info) => {
              const nextQuery = info.lastName.trim() || q;
              setQ(nextQuery);
              runSearch(nextQuery);
            }}
          />
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
            if (!val.trim()) { setSearched(false); setResults([]); }
          }}
          placeholder="Search by name or mobile number..."
          autoFocus
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

      {searched && (
        <div className="mt-4">
          {pending && results.length === 0 ? (
            <SearchSkeleton />
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500">No participants found for &ldquo;{q}&rdquo;.</p>
          ) : (
            <SessionCheckInList
              participants={results}
              sessionId={sessionId}
              isVictoryDay={isVictoryDay}
              requiresVictoryDay={requiresVictoryDay}
              onAction={() => runSearch(q)}
              searchQuery={q.trim()}
            />
          )}
        </div>
      )}
    </div>
  );
}

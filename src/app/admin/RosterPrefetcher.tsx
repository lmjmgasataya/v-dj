"use client";

import { useEffect, useRef, useState } from "react";
import { getCheckinRoster } from "./actions";
import { saveRosterSnapshot, loadRosterSnapshot } from "@/lib/offlineStore";
import { ORIENTATION_SESSION_NAME } from "@/lib/constants";
import type { ClassSession } from "@/db/schema";

type Status = "idle" | "prefetching" | "ready";

/**
 * Quietly caches every session's check-in roster to localStorage, not just
 * the one the volunteer happens to select — so a device that's only ever
 * visited /admin once (online) can still search/check in for ANY session
 * once the connection drops, without needing to have opened each session
 * individually beforehand.
 *
 * A session already cached from a previous visit is skipped — its snapshot
 * gets refreshed for real whenever it's actually opened in ParticipantSearch,
 * so this sweep only needs to give every OTHER session a first-time baseline.
 * That keeps a reload from re-fetching all of them again every time.
 */
export function RosterPrefetcher({ sessions, victoryDayAllowAllClasses }: { sessions: ClassSession[]; victoryDayAllowAllClasses: boolean }) {
  const startedRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const missing = sessions.filter((s) => loadRosterSnapshot(s.id).length === 0);
    if (missing.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("ready");
      return;
    }
    if (!navigator.onLine) return;

    let cancelled = false;
    setStatus("prefetching");
    setProgress({ done: 0, total: missing.length });

    async function prefetchAll() {
      for (const session of missing) {
        if (cancelled) return;
        const isOrientation = session.name === ORIENTATION_SESSION_NAME;
        try {
          const rows = await getCheckinRoster(session.id, session.isVictoryDay, session.requiresVictoryDay, victoryDayAllowAllClasses, isOrientation);
          if (cancelled) return;
          saveRosterSnapshot(session.id, rows);
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        } catch {
          // offline mid-prefetch (or a transient query failure) — stop here;
          // whatever's cached so far still stands, and the rest will be
          // picked up on a future online visit.
          return;
        }
      }
      if (!cancelled) setStatus("ready");
    }

    void prefetchAll();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "idle") return null;

  if (status === "prefetching") {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 flex flex-col gap-1.5">
        <span className="text-sm text-indigo-700">
          Preparing sessions for offline use — {progress.done}/{progress.total}
        </span>
        <div className="h-1.5 w-full rounded-full bg-indigo-100 overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return <p className="text-xs text-gray-400">✓ Offline ready — every session is cached on this device.</p>;
}

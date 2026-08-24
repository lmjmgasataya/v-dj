"use client";

import { useEffect, useRef, useState } from "react";
import { getCheckinRoster } from "./actions";
import { saveRosterSnapshot, loadRosterSnapshot } from "@/lib/offlineStore";
import { ORIENTATION_SESSION_NAME } from "@/lib/constants";
import type { ClassSession } from "@/db/schema";

type RosterStatus = "idle" | "prefetching" | "ready";

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
 *
 * Also warms the camera QR scanner's (~1MB) lazy-loaded dependency here, at
 * the same time and under the same visible status — it has the identical
 * "must be fetched at least once online before it can work offline" problem,
 * and doing it silently on click (or on opening the scanner) left no way to
 * tell whether it had actually finished downloading before going offline.
 */
export function RosterPrefetcher({ sessions, victoryDayAllowAllClasses, qrCheckin }: { sessions: ClassSession[]; victoryDayAllowAllClasses: boolean; qrCheckin?: boolean }) {
  const startedRef = useRef(false);
  const [rosterStatus, setRosterStatus] = useState<RosterStatus>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [scannerReady, setScannerReady] = useState(!qrCheckin);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (qrCheckin) {
      import("html5-qrcode")
        .then(() => setScannerReady(true))
        .catch(() => {
          // still offline-incapable until a future online visit succeeds —
          // left false, no retry loop here since without a connection there's
          // nothing to retry yet
        });
    }

    const missing = sessions.filter((s) => loadRosterSnapshot(s.id).length === 0);
    if (missing.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRosterStatus("ready");
      return;
    }
    if (!navigator.onLine) return;

    let cancelled = false;
    setRosterStatus("prefetching");
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
      if (!cancelled) setRosterStatus("ready");
    }

    void prefetchAll();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rostersReady = rosterStatus === "ready";

  if (rosterStatus === "idle" && scannerReady) return null;

  if (rosterStatus === "prefetching" || (rostersReady && !scannerReady)) {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 flex flex-col gap-1.5">
        <span className="text-sm text-indigo-700">
          {rosterStatus === "prefetching"
            ? `Preparing sessions for offline use — ${progress.done}/${progress.total}`
            : "Preparing camera scanner for offline use…"}
        </span>
        {rosterStatus === "prefetching" && (
          <div className="h-1.5 w-full rounded-full bg-indigo-100 overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    );
  }

  if (rostersReady && scannerReady) {
    return (
      <p className="text-xs text-gray-400">
        ✓ Offline ready — every session{qrCheckin ? " and the camera scanner are" : " is"} cached on this device.
      </p>
    );
  }

  return null;
}

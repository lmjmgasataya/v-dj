"use client";

import { useEffect, useRef } from "react";
import { getCheckinRoster } from "./actions";
import { saveRosterSnapshot } from "@/lib/offlineStore";
import { ORIENTATION_SESSION_NAME } from "@/lib/constants";
import type { ClassSession } from "@/db/schema";

/**
 * Quietly caches every session's check-in roster to localStorage as soon as
 * /admin loads, not just the one the volunteer happens to select — so a
 * device that's only ever visited /admin once (online) can still search/check
 * in for ANY session once the connection drops, without needing to have
 * opened each session individually beforehand.
 */
export function RosterPrefetcher({ sessions, victoryDayAllowAllClasses }: { sessions: ClassSession[]; victoryDayAllowAllClasses: boolean }) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!navigator.onLine) return;

    let cancelled = false;

    async function prefetchAll() {
      for (const session of sessions) {
        if (cancelled) return;
        const isOrientation = session.name === ORIENTATION_SESSION_NAME;
        try {
          const rows = await getCheckinRoster(session.id, session.isVictoryDay, session.requiresVictoryDay, victoryDayAllowAllClasses, isOrientation);
          if (cancelled) return;
          saveRosterSnapshot(session.id, rows);
        } catch {
          // offline mid-prefetch (or a transient query failure) — stop here,
          // whatever's cached from earlier sessions in the loop still stands
          return;
        }
      }
    }

    void prefetchAll();
    return () => {
      cancelled = true;
    };
  }, [sessions, victoryDayAllowAllClasses]);

  return null;
}

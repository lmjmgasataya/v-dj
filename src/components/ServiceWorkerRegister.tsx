"use client";

import { useEffect } from "react";

const CACHE_PREFIX = "dj-shell-";

/**
 * Registers the offline check-in page shell — but only while offline_checkin
 * is actually turned on. Its own fallback logic (public/sw.js) is purpose-
 * built around /admin specifically, not a general app-wide PWA shell, so
 * there's nothing worth keeping cached when the feature is off. Leaving a
 * stale registration around after the flag is disabled would let a device
 * keep loading a half-working cached snapshot of /admin while disconnected —
 * one where check-ins just silently fail instead of queueing, since none of
 * the offline-aware behavior activates without the flag.
 */
export function ServiceWorkerRegister({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Next dev-server chunk URLs aren't reliably content-hashed/immutable the way
    // production builds are, so a cache-first SW here will happily keep serving a
    // stale JS bundle across edits — causing hydration mismatches against the
    // freshly rendered (and freshly coded) server HTML. Never register in dev.
    if (!enabled || process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.filter((k) => k.startsWith(CACHE_PREFIX)).forEach((k) => caches.delete(k));
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // offline shell just won't be available — not fatal
    });
  }, [enabled]);

  return null;
}

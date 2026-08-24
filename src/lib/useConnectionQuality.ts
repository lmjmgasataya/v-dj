"use client";

import { useEffect, useRef, useState } from "react";

export type ConnectionQuality = "strong" | "unstable" | "offline";
type PingResult = "ok" | "slow" | "fail";

const PING_INTERVAL_MS = 12000;
const PING_TIMEOUT_MS = 4000;
const UNSTABLE_LATENCY_MS = 1500;
const HISTORY_SIZE = 3;

/**
 * navigator.onLine only reflects whether a network interface is up, not
 * whether the server is actually reachable — on flaky venue WiFi it can
 * report "online" while every request is timing out. This pings a
 * do-nothing endpoint on an interval and classifies the last few attempts,
 * so "connected to WiFi but nothing is going through" shows up as unstable
 * instead of silently looking fine.
 */
export function useConnectionQuality(enabled: boolean): ConnectionQuality {
  const [quality, setQuality] = useState<ConnectionQuality>("strong");
  const history = useRef<PingResult[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function record(result: PingResult) {
      history.current = [...history.current, result].slice(-HISTORY_SIZE);
    }

    function classify() {
      const recent = history.current;
      if (!navigator.onLine || recent.slice(-2).every((r) => r === "fail")) {
        setQuality("offline");
      } else if (recent.some((r) => r === "fail" || r === "slow")) {
        setQuality("unstable");
      } else {
        setQuality("strong");
      }
    }

    async function ping() {
      if (!navigator.onLine) {
        record("fail");
        classify();
        schedule();
        return;
      }

      const started = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      try {
        const res = await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
        const elapsed = performance.now() - started;
        if (cancelled) return;
        record(res.ok ? (elapsed > UNSTABLE_LATENCY_MS ? "slow" : "ok") : "fail");
      } catch {
        if (cancelled) return;
        record("fail");
      } finally {
        clearTimeout(timeout);
      }
      classify();
      schedule();
    }

    function schedule() {
      if (cancelled) return;
      timer = setTimeout(ping, PING_INTERVAL_MS);
    }

    function handleOffline() {
      record("fail");
      classify();
    }

    void ping();
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", ping);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", ping);
    };
  }, [enabled]);

  return enabled ? quality : "strong";
}

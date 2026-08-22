"use client";

import { useEffect, useRef, useState } from "react";
import { checkInByQr, revalidateAfterOfflineSync } from "./actions";
import { listPending, removePending, PENDING_CHANGED_EVENT, type PendingCheckIn } from "@/lib/offlineStore";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { useToast } from "@/components/toast/ToastProvider";

export function OfflineSyncBar() {
  const isOnline = useOnlineStatus();
  const [pending, setPending] = useState<PendingCheckIn[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const syncingRef = useRef(false);
  const toast = useToast();

  function refresh() {
    setPending(listPending());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    window.addEventListener(PENDING_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PENDING_CHANGED_EVENT, refresh);
  }, []);

  async function drain() {
    if (syncingRef.current) return;
    const queue = listPending();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);

    let syncedAny = false;
    for (const item of queue) {
      let result;
      try {
        // skipRevalidate=true — revalidating after every item in the batch
        // would push a full-page refresh to /admin per item, which looks
        // like the page reloading over and over. Revalidate once at the end.
        result = await checkInByQr(item.participantId, item.sessionId, item.remarks, item.status, item.method, true);
      } catch {
        // network issue — stop here, retry the rest next time we come online
        break;
      }
      if ("error" in result) {
        // a real rule rejected this one (e.g. Victory Day not complete) — drop it
        // and tell the volunteer, rather than blocking the rest of the queue forever
        toast.show(`Offline check-in for participant #${item.participantId} could not sync: ${result.error}`, "error");
      }
      removePending(item.localId);
      syncedAny = true;
    }

    if (syncedAny) await revalidateAfterOfflineSync();

    setSyncing(false);
    syncingRef.current = false;
    const remaining = listPending();
    setPending(remaining);
    if (remaining.length === 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 4000);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOnline && pending.length > 0) void drain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pending.length]);

  const count = pending.length;

  if (!isOnline) {
    return (
      <Banner tone="warn">
        {count > 0
          ? `Offline — ${count} check-in${count !== 1 ? "s" : ""} queued, will sync when back online.`
          : "Offline — check-ins will be saved locally and synced when back online."}
      </Banner>
    );
  }

  if (syncing) {
    return <Banner tone="info">Syncing {count} check-in{count !== 1 ? "s" : ""}…</Banner>;
  }

  if (count > 0) {
    return (
      <Banner tone="warn">
        {count} check-in{count !== 1 ? "s" : ""} waiting to sync.{" "}
        <button type="button" onClick={() => void drain()} className="underline font-semibold">
          Sync now
        </button>
      </Banner>
    );
  }

  if (justSynced) {
    return <Banner tone="success">All check-ins synced.</Banner>;
  }

  return null;
}

function Banner({ tone, children }: { tone: "warn" | "info" | "success"; children: React.ReactNode }) {
  const toneCls =
    tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : tone === "info"
      ? "bg-indigo-50 border-indigo-200 text-indigo-800"
      : "bg-green-50 border-green-200 text-green-800";
  return (
    <div className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${toneCls}`}>{children}</div>
  );
}

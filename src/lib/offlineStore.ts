"use client";

import type { CheckinRosterEntry } from "@/app/admin/actions";
import type { CheckInStatus, CheckInMethod } from "@/db/schema";

const ROSTER_KEY_PREFIX = "dj:roster:";
const PENDING_KEY = "dj:pending-checkins";

export interface PendingCheckIn {
  localId: string;
  participantId: number;
  sessionId: number;
  remarks?: string;
  status?: CheckInStatus;
  method: CheckInMethod;
  queuedAt: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — offline caching is best-effort
  }
}

export function saveRosterSnapshot(sessionId: number, roster: CheckinRosterEntry[]) {
  writeJson(`${ROSTER_KEY_PREFIX}${sessionId}`, roster);
}

export function loadRosterSnapshot(sessionId: number): CheckinRosterEntry[] {
  return readJson(`${ROSTER_KEY_PREFIX}${sessionId}`, []);
}

export const PENDING_CHANGED_EVENT = "dj:pending-changed";

function notifyPendingChanged() {
  window.dispatchEvent(new Event(PENDING_CHANGED_EVENT));
}

export function enqueueCheckIn(entry: Omit<PendingCheckIn, "localId" | "queuedAt">): PendingCheckIn {
  const pending = listPending();
  const queued: PendingCheckIn = { ...entry, localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`, queuedAt: Date.now() };
  writeJson(PENDING_KEY, [...pending, queued]);
  notifyPendingChanged();
  return queued;
}

export function listPending(): PendingCheckIn[] {
  return readJson(PENDING_KEY, []);
}

export function removePending(localId: string) {
  writeJson(PENDING_KEY, listPending().filter((p) => p.localId !== localId));
  notifyPendingChanged();
}

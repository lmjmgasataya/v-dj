"use client";

import { useEffect, useState, useTransition } from "react";
import { hasLeaderAudience, type EventAudience } from "@/lib/eventAudience";
import {
  listEventRegisteredAttendees,
  listEventWalkInCandidates,
  checkInEventVgLeader,
  checkInEventIntern,
  checkInEventWalkIn,
  undoEventCheckIn,
  listEventCheckIns,
  type EventSearchResult,
  type EventCheckInRow,
  type WalkInCandidate,
} from "./actions";

interface EventOption {
  id: number;
  name: string;
  eventDate: string;
  audience: EventAudience[];
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";

// Leadership Group Leaders check in as VG leaders; the entry only satisfies the enum type.
const TYPE_LABEL: Record<EventAudience, string> = {
  vg_leader: "VG Leader",
  leadership_group_leader: "Leadership Group Leader",
  intern: "Intern",
};

const MAX_RESULTS = 20;

function AttendeeSearch({
  eventId,
  audience,
  onChange,
  refreshKey,
}: {
  eventId: number;
  audience: EventAudience[];
  onChange: () => void;
  refreshKey: number;
}) {
  const [q, setQ] = useState("");
  const [attendees, setAttendees] = useState<EventSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const results = q.trim()
    ? attendees.filter((r) => r.attendeeName.toLowerCase().includes(q.trim().toLowerCase()))
    : attendees;
  // A long list is slow to scroll on a phone at the door; search finds anyone past the first ones.
  const shown = results.slice(0, MAX_RESULTS);

  // Preload the full pre-registered list for this event, and re-fetch when check-ins
  // change elsewhere (e.g. an undo from the "Checked In" list below), so a row's status
  // doesn't go stale. Search itself is purely client-side filtering of this list.
  useEffect(() => {
    let cancelled = false;
    listEventRegisteredAttendees(eventId, audience).then((r) => {
      if (!cancelled) {
        setAttendees(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function handleCheckIn(r: EventSearchResult) {
    setPendingKey(r.key);
    setError(null);
    const res =
      r.attendeeType === "vg_leader"
        ? await checkInEventVgLeader(eventId, r.vgLeaderId!)
        : await checkInEventIntern(eventId, r.internId!);
    setPendingKey(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setAttendees((prev) => prev.map((x) => (x.key === r.key ? { ...x, checkInId: res.checkInId } : x)));
    onChange();
  }

  async function handleUndo(r: EventSearchResult) {
    if (!r.checkInId) return;
    setPendingKey(r.key);
    await undoEventCheckIn(r.checkInId);
    setPendingKey(null);
    setAttendees((prev) => prev.map((x) => (x.key === r.key ? { ...x, checkInId: null } : x)));
    onChange();
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name..."
        className={inputCls}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-400 py-2">Loading pre-registered attendees...</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">
          {attendees.length === 0 ? "No one has pre-registered for this event yet." : "No matches."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((r) => (
            <div key={r.key} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.attendeeName}</p>
                  {r.service && <p className="text-xs text-gray-400">{r.service}</p>}
                </div>
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                  {TYPE_LABEL[r.attendeeType]}
                </span>
                {r.isWalkIn && (
                  <span className="text-xs font-medium bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full shrink-0">Walk-in</span>
                )}
              </div>
              {r.checkInId ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Checked In</span>
                  <button
                    onClick={() => handleUndo(r)}
                    disabled={pendingKey === r.key}
                    className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
                  >
                    Undo
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleCheckIn(r)}
                  disabled={pendingKey === r.key}
                  className="text-xs font-semibold bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition shrink-0"
                >
                  {pendingKey === r.key ? "Checking in..." : "Check In"}
                </button>
              )}
            </div>
          ))}
          {results.length > shown.length && (
            <p className="text-xs text-gray-400 text-center pt-1">
              Showing {shown.length} of {results.length}. Search by name to find someone else.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Check-in for VG leaders who didn't register. Only leaders with an updated profile (saved this
 * update period and 100% complete) can be checked in; the server checks again.
 */
function WalkInSearch({ eventId, onChange, refreshKey }: { eventId: number; onChange: () => void; refreshKey: number }) {
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState<WalkInCandidate[] | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preloaded with the event, and again when check-ins change (an undone walk-in is offered again).
  // Nobody is listed until a name is typed.
  useEffect(() => {
    let cancelled = false;
    listEventWalkInCandidates(eventId).then((c) => {
      if (!cancelled) setCandidates(c);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, refreshKey]);

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches =
    words.length === 0 || !candidates
      ? []
      : candidates.filter((c) => words.every((w) => c.attendeeName.toLowerCase().includes(w))).slice(0, MAX_RESULTS);

  async function handleCheckIn(c: WalkInCandidate) {
    setPendingId(c.vgLeaderId);
    setError(null);
    const res = await checkInEventWalkIn(eventId, c.vgLeaderId);
    setPendingId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCandidates((prev) => prev?.filter((x) => x.vgLeaderId !== c.vgLeaderId) ?? null);
    setQ("");
    onChange();
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-800">Walk-in</h3>
      <p className="text-xs text-gray-500">
        For VG leaders who didn&apos;t register. They need an updated profile in the VGL Portal before they can be checked in.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search VG leaders by name..."
        className={inputCls}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {words.length === 0 ? null : candidates === null ? (
        <p className="text-sm text-gray-400 py-2">Loading VG leaders...</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No VG leader by that name who isn&apos;t registered or checked in already.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((c) => (
            <div key={c.vgLeaderId} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.attendeeName}</p>
                {c.service && <p className="text-xs text-gray-400">{c.service}</p>}
              </div>
              {c.profileUpdated ? (
                <button
                  onClick={() => handleCheckIn(c)}
                  disabled={pendingId === c.vgLeaderId}
                  className="text-xs font-semibold bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition shrink-0"
                >
                  {pendingId === c.vgLeaderId ? "Checking in..." : "Check In"}
                </button>
              ) : (
                <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full shrink-0 text-right">
                  Profile not updated
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventCheckInArea({ events }: { events: EventOption[] }) {
  const [eventId, setEventId] = useState<number | null>(null);
  const [checkedIn, setCheckedIn] = useState<EventCheckInRow[]>([]);
  const [undoingId, setUndoingId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [, startTransition] = useTransition();

  const selectedEvent = events.find((e) => e.id === eventId) ?? null;

  function refreshCheckIns(id: number) {
    startTransition(async () => {
      setCheckedIn(await listEventCheckIns(id));
      setRefreshKey((k) => k + 1);
    });
  }

  function handleEventChange(id: number) {
    setEventId(id);
    setCheckedIn([]);
    refreshCheckIns(id);
  }

  async function handleUndo(id: number) {
    setUndoingId(id);
    await undoEventCheckIn(id);
    setUndoingId(null);
    if (selectedEvent) refreshCheckIns(selectedEvent.id);
  }

  if (events.length === 0) {
    return <p className="text-sm text-gray-400">No upcoming events to check in for.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event</label>
        <select
          value={eventId ?? ""}
          onChange={(e) => handleEventChange(Number(e.target.value))}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="" disabled>
            Select an event...
          </option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {!selectedEvent && <p className="text-sm text-gray-400">Select an event to see who registered.</p>}

      {selectedEvent && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <AttendeeSearch
            key={selectedEvent.id}
            eventId={selectedEvent.id}
            audience={selectedEvent.audience}
            onChange={() => refreshCheckIns(selectedEvent.id)}
            refreshKey={refreshKey}
          />
        </div>
      )}

      {selectedEvent && hasLeaderAudience(selectedEvent.audience) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
          <WalkInSearch
            key={selectedEvent.id}
            eventId={selectedEvent.id}
            onChange={() => refreshCheckIns(selectedEvent.id)}
            refreshKey={refreshKey}
          />
        </div>
      )}

      {selectedEvent && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Checked In</h3>
            <span className="text-sm font-semibold text-indigo-800">{checkedIn.length}</span>
          </div>
          {checkedIn.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400 text-center">No one checked in yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {checkedIn.map((c) => (
                <li key={c.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{c.attendeeName}</span>
                    <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {TYPE_LABEL[c.attendeeType]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {new Date(c.checkedInAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}
                    </span>
                    <button
                      onClick={() => handleUndo(c.id)}
                      disabled={undoingId === c.id}
                      className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
                    >
                      {undoingId === c.id ? "Undoing..." : "Undo"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listEventRegisteredAttendees,
  checkInEventVgLeader,
  checkInEventIntern,
  undoEventCheckIn,
  listEventCheckIns,
  type EventSearchResult,
  type EventCheckInRow,
} from "./actions";

interface EventOption {
  id: number;
  name: string;
  eventDate: string;
  audience: ("vg_leader" | "intern")[];
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";

const TYPE_LABEL: Record<"vg_leader" | "intern", string> = {
  vg_leader: "VG Leader",
  intern: "Intern",
};

function AttendeeSearch({
  eventId,
  audience,
  onChange,
  refreshKey,
}: {
  eventId: number;
  audience: ("vg_leader" | "intern")[];
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
          {results.map((r) => (
            <div key={r.key} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.attendeeName}</p>
                  {r.mobileNumber && <p className="text-xs text-gray-400">{r.mobileNumber}</p>}
                </div>
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                  {TYPE_LABEL[r.attendeeType]}
                </span>
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
        </div>
      )}
    </div>
  );
}

export function EventCheckInArea({ events }: { events: EventOption[] }) {
  const firstEvent = events[0] ?? null;
  const [eventId, setEventId] = useState<number | null>(firstEvent?.id ?? null);
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

  useEffect(() => {
    if (firstEvent) refreshCheckIns(firstEvent.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

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

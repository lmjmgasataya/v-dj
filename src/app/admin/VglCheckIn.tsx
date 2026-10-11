"use client";

import { useEffect, useState, useTransition } from "react";
import { getVglCheckinRoster, checkInVgl, removeVglCheckIn, type VglRosterEntry } from "./vglActions";
import type { CheckInStatus } from "@/db/schema";
import { checkInStatusForDate } from "@/lib/date";
import { checkInStatusBadgeClass } from "@/lib/checkinStatus";
import { useToast } from "@/components/toast/ToastProvider";
import { CheckInStatusPicker } from "./CheckInStatusPicker";
import { CheckInSuccessModal } from "./CheckInSuccessModal";
import { ClaimedCompletedBadge } from "./ClaimedCompletedBadge";

const MAX_RESULTS = 50;

/** Check-in for a VGL-only session — the roster is active VG leaders instead of participants. */
export function VglCheckIn({
  sessionId,
  sessionName,
  confirmBeforeCheckIn = true,
}: {
  sessionId: number;
  sessionName: string;
  confirmBeforeCheckIn?: boolean;
}) {
  const [roster, setRoster] = useState<VglRosterEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<VglRosterEntry | null>(null);
  const [status, setStatus] = useState<CheckInStatus>("On-time");
  const [remarks, setRemarks] = useState("");
  const [success, setSuccess] = useState<{ firstName: string; lastName: string; status: CheckInStatus } | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function reload() {
    startTransition(async () => {
      setRoster(await getVglCheckinRoster(sessionId));
    });
  }

  useEffect(reload, [sessionId]);

  function openConfirm(entry: VglRosterEntry) {
    if (!confirmBeforeCheckIn) {
      submit(entry, checkInStatusForDate(new Date()), "");
      return;
    }
    setSelected(entry);
    setStatus(checkInStatusForDate(new Date()));
    setRemarks("");
  }

  function submit(entry: VglRosterEntry, s: CheckInStatus, r: string) {
    startTransition(async () => {
      const result = await checkInVgl(entry.id, sessionId, r || undefined, s);
      setSelected(null);
      if ("error" in result) {
        toast.show(result.error, "error");
        return;
      }
      setSuccess({ firstName: result.firstName, lastName: result.lastName, status: result.status });
      setQ("");
      setRoster(await getVglCheckinRoster(sessionId));
    });
  }

  function handleUndo(entry: VglRosterEntry) {
    if (!confirm(`Remove check-in of ${entry.lastName}, ${entry.firstName} for "${sessionName}"?`)) return;
    startTransition(async () => {
      await removeVglCheckIn(entry.id, sessionId);
      setRoster(await getVglCheckinRoster(sessionId));
    });
  }

  const query = q.trim().toLowerCase();
  const matches = (roster ?? []).filter((r) => {
    if (!query) return true;
    const haystack = `${r.lastName} ${r.firstName} ${r.nickname ?? ""} ${r.mobileNumber ?? ""}`.toLowerCase();
    return haystack.includes(query);
  });
  const shown = matches.slice(0, MAX_RESULTS);
  const checkedInCount = (roster ?? []).filter((r) => r.checkInId != null && r.checkInStatus !== "Absent").length;

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search VG leader by name or mobile number..."
          className="w-full sm:flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {roster && (
          <span className="text-xs text-gray-500 shrink-0">
            {checkedInCount} / {roster.length} active VG leaders checked in
          </span>
        )}
      </div>

      {roster === null ? (
        <p className="text-sm text-gray-400">Loading VG leaders…</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-gray-400">{query ? `No active VG leader matches "${q}".` : "No active VG leaders found."}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200">
          {shown.map((r) => {
            const isCheckedIn = r.checkInId != null;
            const subtitle = [r.nickname && `"${r.nickname}"`, r.mobileNumber, r.serviceAttending].filter(Boolean).join(" · ");
            return (
              <li key={r.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${isCheckedIn ? "bg-green-50" : "bg-white"}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {r.lastName}, {r.firstName}{r.middleInitial ? ` ${r.middleInitial}.` : ""}
                    </p>
                    {r.claimedAndCompleted && <ClaimedCompletedBadge />}
                  </div>
                  {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
                  {isCheckedIn && r.checkInRemarks && <p className="text-xs text-amber-700 italic mt-0.5">{r.checkInRemarks}</p>}
                </div>
                {isCheckedIn ? (
                  <div className="flex items-center gap-3 shrink-0">
                    {r.checkInStatus && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${checkInStatusBadgeClass(r.checkInStatus)}`}>
                        {r.checkInStatus}
                      </span>
                    )}
                    <button
                      onClick={() => handleUndo(r)}
                      disabled={pending}
                      className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openConfirm(r)}
                    disabled={pending}
                    className="shrink-0 bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
                  >
                    Check In
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {matches.length > MAX_RESULTS && (
        <p className="text-xs text-gray-400">Showing {MAX_RESULTS} of {matches.length} — type to narrow down.</p>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Check In</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                {selected.lastName}, {selected.firstName} — {sessionName}
              </p>
            </div>
            <CheckInStatusPicker value={status} onChange={setStatus} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Remarks <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelected(null)}
                disabled={pending}
                className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submit(selected, status, remarks)}
                disabled={pending}
                className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                {pending ? "Checking in..." : "Confirm Check In"}
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <CheckInSuccessModal
          firstName={success.firstName}
          lastName={success.lastName}
          tableNumber={null}
          showTable={false}
          status={success.status}
          onDismiss={() => setSuccess(null)}
        />
      )}
    </>
  );
}

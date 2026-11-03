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
import { useNewCheckinUi } from "./ui/NewCheckinUi";
import { ConfirmCheckInSheet } from "./ui/ConfirmCheckInSheet";
import { StatusPill } from "./ui/StatusPill";
import { SearchIcon, Spinner } from "./ui/icons";
import { ConfirmRemoveSheet } from "./ui/ConfirmRemoveSheet";

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
  const [undoEntry, setUndoEntry] = useState<VglRosterEntry | null>(null);
  const [status, setStatus] = useState<CheckInStatus>("On-time");
  const [remarks, setRemarks] = useState("");
  const [success, setSuccess] = useState<{ firstName: string; lastName: string; status: CheckInStatus } | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const newUi = useNewCheckinUi();

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
    if (newUi) {
      setUndoEntry(entry);
      return;
    }
    if (!confirm(`Remove check-in of ${entry.lastName}, ${entry.firstName} for "${sessionName}"?`)) return;
    removeEntryCheckIn(entry);
  }

  function removeEntryCheckIn(entry: VglRosterEntry) {
    startTransition(async () => {
      await removeVglCheckIn(entry.id, sessionId);
      setRoster(await getVglCheckinRoster(sessionId));
      setUndoEntry(null);
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

  const successModal = success && (
    <CheckInSuccessModal
      firstName={success.firstName}
      lastName={success.lastName}
      tableNumber={null}
      showTable={false}
      status={success.status}
      onDismiss={() => setSuccess(null)}
    />
  );

  if (newUi) {
    return (
      <>
        <div className="flex flex-col gap-1.5">
          <label className="relative">
            <span className="sr-only">Search VG leader by name or mobile number</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search VG leader by name or mobile number"
              className="h-12 w-full rounded-xl border border-gray-300 bg-white pr-3 pl-11 text-base text-gray-900 placeholder:text-gray-500 focus:border-[#00428E] focus:outline-none focus:ring-2 focus:ring-[#00428E]/20"
            />
          </label>
          {roster && (
            <p className="px-1 text-sm text-gray-600">
              <span className="tabular-nums">{checkedInCount}</span> of <span className="tabular-nums">{roster.length}</span> active VG leaders checked in
            </p>
          )}
        </div>

        {roster === null ? (
          <div className="flex items-center gap-2 px-1 text-sm text-gray-600"><Spinner className="size-4" />Loading VG leaders…</div>
        ) : matches.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-6 text-center ring-1 ring-gray-200">
            <p className="font-medium text-gray-900">{query ? `No active VG leader matches “${q.trim()}”` : "No active VG leaders found"}</p>
            {query && <p className="mt-1 text-sm text-gray-600">Try their last name, nickname or mobile number.</p>}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
            {shown.map((r) => {
              const isCheckedIn = r.checkInId != null;
              const subtitle = [r.nickname && `“${r.nickname}”`, r.mobileNumber, r.serviceAttending].filter(Boolean).join(" · ");
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {r.lastName}, {r.firstName}{r.middleInitial ? ` ${r.middleInitial}.` : ""}
                      </p>
                      {r.claimedAndCompleted && <ClaimedCompletedBadge />}
                    </div>
                    {subtitle && <p className="truncate text-sm text-gray-600">{subtitle}</p>}
                    {isCheckedIn && r.checkInRemarks && <p className="mt-1 text-sm text-amber-800">{r.checkInRemarks}</p>}
                  </div>
                  {isCheckedIn ? (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {r.checkInStatus && <StatusPill status={r.checkInStatus} />}
                      <button
                        onClick={() => handleUndo(r)}
                        disabled={pending}
                        className="-mr-2 -mb-2.5 h-11 rounded-lg px-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-[#00428E] disabled:opacity-50"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openConfirm(r)}
                      disabled={pending}
                      className="h-11 shrink-0 rounded-xl bg-[#00428E] px-4 text-sm font-semibold text-white hover:bg-[#003578] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00428E] disabled:opacity-50"
                    >
                      Check in
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {matches.length > MAX_RESULTS && (
          <p className="px-1 text-sm text-gray-600">Showing {MAX_RESULTS} of {matches.length}. Type to narrow it down.</p>
        )}

        {selected && (
          <ConfirmCheckInSheet
            name={`${selected.lastName}, ${selected.firstName}`}
            detail={sessionName}
            status={status}
            onStatusChange={setStatus}
            remarks={remarks}
            onRemarksChange={setRemarks}
            remarksPlaceholder=""
            pending={pending}
            onCancel={() => setSelected(null)}
            onConfirm={() => submit(selected, status, remarks)}
          />
        )}
        {undoEntry && (
          <ConfirmRemoveSheet
            name={`${undoEntry.firstName} ${undoEntry.lastName}`}
            sessionName={sessionName}
            pending={pending}
            onCancel={() => setUndoEntry(null)}
            onConfirm={() => removeEntryCheckIn(undoEntry)}
          />
        )}
        {successModal}
      </>
    );
  }

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

      {successModal}
    </>
  );
}

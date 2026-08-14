"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { checkInParticipant, removeCheckIn } from "./actions";
import { toTitleCase } from "@/lib/text";
import { useToast } from "@/components/toast/ToastProvider";
import { CheckInSuccessModal } from "./CheckInSuccessModal";
import { CheckInStatusPicker, checkInStatusBadgeClass } from "./CheckInStatusPicker";
import { checkInStatusTextClass } from "@/lib/checkinStatus";
import { checkInStatusForDate, isOnTimeWindow, isWithinLateCutoff } from "@/lib/date";
import type { CheckInStatus } from "@/db/schema";

interface ParticipantWithStatus {
  id: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  mobileNumber: string | null;
  lifestage: string | null;
  gender: string;
  preferredNameOnId: string | null;
  victoryDate: string | null;
  registrationFee: string | null;
  victoryDayDate: string | null;
  victoryDayCount: number;
  totalVictoryDaySessions: number;
  completedVictoryDay: boolean;
  checkInId: number | null;
  checkedInAt: Date | null;
  checkInRemarks: string | null;
  checkInStatus: CheckInStatus | null;
  tableNumber: number | null;
}

function CheckInRow({ p, sessionId, isVictoryDay, requiresVictoryDay, onAction, confirmBeforeCheckIn = true, showTableNumber = true, autoCheckin = false, autoCheckin915 = false }: { p: ParticipantWithStatus; sessionId: number; isVictoryDay: boolean; requiresVictoryDay: boolean; onAction?: () => void; confirmBeforeCheckIn?: boolean; showTableNumber?: boolean; autoCheckin?: boolean; autoCheckin915?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<CheckInStatus>("On-time");
  const [successInfo, setSuccessInfo] = useState<{ firstName: string; lastName: string; tableNumber: number | null; status: CheckInStatus } | null>(null);
  const toast = useToast();
  const isCheckedIn = p.checkInId != null;
  const hasVictoryDay = !!p.victoryDate || p.completedVictoryDay;
  const isIncomplete = !!p.victoryDayDate && !p.completedVictoryDay && !p.victoryDate;
  const blocked = requiresVictoryDay && !isVictoryDay && !hasVictoryDay;

  function submitCheckIn(remarksValue: string, statusOverride?: CheckInStatus) {
    startTransition(async () => {
      const result = await checkInParticipant(p.id, sessionId, remarksValue || undefined, statusOverride);
      setShowModal(false);
      setRemarks("");
      if ("error" in result) {
        toast.show(result.error, "error");
      } else {
        setSuccessInfo({
          firstName: toTitleCase(p.firstName),
          lastName: toTitleCase(p.lastName),
          tableNumber: result.tableNumber,
          status: statusOverride ?? checkInStatusForDate(new Date()),
        });
      }
      onAction?.();
    });
  }

  function handleConfirmCheckIn() {
    submitCheckIn(remarks, status);
  }

  function handleCheckInClick() {
    if (autoCheckin && isOnTimeWindow()) {
      submitCheckIn("", "On-time");
      return;
    }
    if (autoCheckin915 && isWithinLateCutoff()) {
      submitCheckIn("", checkInStatusForDate(new Date()));
      return;
    }
    if (confirmBeforeCheckIn) {
      setStatus(checkInStatusForDate(new Date()));
      setShowModal(true);
    } else {
      submitCheckIn("");
    }
  }

  return (
    <>
      <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
        isCheckedIn ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
      }`}>
        <div>
          <p className="font-semibold text-gray-900 text-sm capitalize">
            {p.gender === "Male" ? "👨🏻" : "👩🏻"}{" "}
            {toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}{p.middleInitial ? ` ${toTitleCase(p.middleInitial)}.` : ""}{" "}
            <span className="font-normal text-gray-400">(Class {p.registrationFee ?? "—"})</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {p.mobileNumber} · {p.lifestage}
          </p>
          {(() => {
            const vd = p.victoryDate ?? p.victoryDayDate;
            if (!vd) return null;
            /* Victory Day: — label hidden for now
            if (!vd) return (
              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                Victory Day: —
              </span>
            );
            */
            if (isIncomplete) return (
              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Victory Day: {vd} ({p.victoryDayCount}/{p.totalVictoryDaySessions})
              </span>
            );
            return (
              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Victory Day: {vd}
              </span>
            );
          })()}
          {isCheckedIn && p.checkInRemarks && (
            <p className="text-xs text-amber-700 mt-1 italic">Remarks: {p.checkInRemarks}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isCheckedIn ? (
            <>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold text-xs ${p.checkInStatus ? checkInStatusTextClass(p.checkInStatus) : "text-green-600"}`}>✓ Checked In</span>
                  {p.checkInStatus && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${checkInStatusBadgeClass(p.checkInStatus)}`}>
                      {p.checkInStatus}
                    </span>
                  )}
                </div>
                {p.tableNumber ? (
                  <span className="text-xs font-medium text-indigo-600">Table {p.tableNumber}</span>
                ) : (
                  <span className="text-xs text-gray-400 italic">No table</span>
                )}
                {p.checkedInAt && (
                  <span className="text-xs text-green-500">
                    {new Date(p.checkedInAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" })}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  if (!confirm(`Remove check-in for ${toTitleCase(p.firstName)} ${toTitleCase(p.lastName)}?`)) return;
                  startTransition(async () => {
                    await removeCheckIn(p.id, sessionId);
                    toast.show("Check-in removed.");
                    onAction?.();
                  });
                }}
                disabled={pending}
                className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
              >
                Undo
              </button>
            </>
          ) : blocked ? (
            <span className="text-xs text-gray-400 italic">
              {isIncomplete ? `${p.victoryDayCount}/${p.totalVictoryDaySessions}` : "No Victory Day yet"}
            </span>
          ) : (
            <button
              onClick={handleCheckInClick}
              disabled={pending}
              className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
            >
              Check In
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Check In</h3>
              <p className="text-sm text-gray-600 mt-0.5 capitalize">
                {toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}{p.middleInitial ? ` ${toTitleCase(p.middleInitial)}.` : ""}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <CheckInStatusPicker value={status} onChange={setStatus} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Remarks <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. arrived late, missed first 30 minutes"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowModal(false); setRemarks(""); }}
                disabled={pending}
                className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckIn}
                disabled={pending}
                className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                {pending ? "Checking in..." : "Confirm Check In"}
              </button>
            </div>
          </div>
        </div>
      )}

      {successInfo && (
        <CheckInSuccessModal
          firstName={successInfo.firstName}
          lastName={successInfo.lastName}
          tableNumber={successInfo.tableNumber}
          status={successInfo.status}
          showTable={showTableNumber}
          onDismiss={() => setSuccessInfo(null)}
        />
      )}
    </>
  );
}

export function SessionCheckInList({
  participants,
  sessionId,
  isVictoryDay,
  requiresVictoryDay,
  onAction,
  searchQuery,
  confirmBeforeCheckIn,
  showTableNumber,
  autoCheckin,
  autoCheckin915,
}: {
  participants: ParticipantWithStatus[];
  sessionId: number;
  isVictoryDay: boolean;
  requiresVictoryDay: boolean;
  onAction?: () => void;
  searchQuery?: string;
  confirmBeforeCheckIn?: boolean;
  showTableNumber?: boolean;
  autoCheckin?: boolean;
  autoCheckin915?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {participants.length} result{participants.length !== 1 ? "s" : ""}
        </p>
        {searchQuery && (
          <Link
            href={`/report?q=${encodeURIComponent(searchQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
          >
            View Attendance
          </Link>
        )}
      </div>
      {participants.map((p) => (
        <CheckInRow key={p.id} p={p} sessionId={sessionId} isVictoryDay={isVictoryDay} requiresVictoryDay={requiresVictoryDay} onAction={onAction} confirmBeforeCheckIn={confirmBeforeCheckIn} showTableNumber={showTableNumber} autoCheckin={autoCheckin} autoCheckin915={autoCheckin915} />
      ))}
    </div>
  );
}

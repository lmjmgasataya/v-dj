"use client";

import { useEffect, useId, useState } from "react";
import { checkInStatusBgClass, checkInStatusTextClass } from "@/lib/checkinStatus";
import type { CheckInStatus } from "@/db/schema";
import { useNewCheckinUi } from "./ui/NewCheckinUi";
import { Sheet, SheetBody } from "./ui/Sheet";
import { CheckIcon, CloudUploadIcon } from "./ui/icons";

// New UI: the result reads at arm's length — full-strength status color plus the status word.
const RESULT_DISC: Record<CheckInStatus, string> = { "On-time": "bg-green-600", Late: "bg-amber-600", Absent: "bg-red-600" };
const RESULT_WORD: Record<CheckInStatus, string> = { "On-time": "text-green-800", Late: "text-amber-800", Absent: "text-red-700" };

const AUTO_DISMISS_SECONDS = 10;

export function CheckInSuccessModal({
  firstName,
  lastName,
  tableNumber,
  showTable = true,
  status = "On-time",
  alreadyCheckedIn = false,
  pendingSync = false,
  onDismiss,
}: {
  firstName: string;
  lastName: string;
  tableNumber: number | null;
  showTable?: boolean;
  status?: CheckInStatus;
  alreadyCheckedIn?: boolean;
  pendingSync?: boolean;
  onDismiss: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS);
  const newUi = useNewCheckinUi();
  const titleId = useId();

  useEffect(() => {
    if (secondsLeft <= 0) {
      onDismiss();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onDismiss]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onDismiss();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  if (newUi) {
    return (
      <Sheet labelledBy={titleId} onClose={onDismiss} dismissOnBackdrop>
        <SheetBody className="flex flex-col items-center text-center">
          <div className={`flex size-16 items-center justify-center rounded-full text-white animate-result-pop ${alreadyCheckedIn ? "bg-[#00428E]" : RESULT_DISC[status]}`}>
            <CheckIcon className="size-9" />
          </div>
          {!alreadyCheckedIn && (
            <p className={`mt-3 text-lg font-semibold ${RESULT_WORD[status]}`}>{status}</p>
          )}
          <h3 id={titleId} className={`${alreadyCheckedIn ? "mt-4" : "mt-1"} text-xl font-semibold text-balance text-gray-900`}>
            {alreadyCheckedIn ? `${firstName} is already checked in` : `You’re checked in, ${firstName}!`}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {lastName} &middot; {alreadyCheckedIn ? "No need to check in again" : "Welcome!"}
          </p>

          {pendingSync && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">
              <CloudUploadIcon className="size-3.5 text-slate-600" />
              Saved offline. Will sync when back online.
            </p>
          )}

          {showTable && (
            <div className="mt-5 w-full rounded-xl bg-gray-50 py-4 ring-1 ring-inset ring-gray-200">
              <p className="text-sm font-medium text-gray-600">Table</p>
              {pendingSync ? (
                <p className="mt-1 text-lg font-semibold text-slate-700">Assigned after sync</p>
              ) : (
                <p className="text-6xl leading-tight font-semibold tabular-nums text-[#00428E]">{tableNumber ?? "—"}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="mt-5 h-12 w-full rounded-xl bg-[#00428E] text-base font-semibold text-white hover:bg-[#003578]"
          >
            OK <span className="font-normal tabular-nums text-white/75">({secondsLeft})</span>
          </button>
        </SheetBody>
      </Sheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-1 text-center">
        <div className={`w-20 h-20 rounded-full ${alreadyCheckedIn ? "bg-blue-100" : checkInStatusBgClass(status)} flex items-center justify-center mb-3 animate-check-circle-pop`}>
          <CheckCircleIcon className={alreadyCheckedIn ? "text-blue-600" : checkInStatusTextClass(status)} />
        </div>
        <p className="text-xl font-bold text-gray-900">
          {alreadyCheckedIn ? `${firstName} is already checked in` : `You’re checked in, ${firstName}!`}
        </p>
        <p className="text-sm text-gray-500">
          {lastName} &middot; {alreadyCheckedIn ? "No need to check in again" : "Welcome!"}
        </p>

        {pendingSync && (
          <p className="mt-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            Saved offline — will sync when back online
          </p>
        )}

        {showTable && (
          <div className={`w-full rounded-2xl border px-6 py-5 flex flex-col items-center gap-1 mt-6 ${pendingSync ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Your Table</p>
            {pendingSync ? (
              <p className="text-lg font-bold text-amber-700 leading-tight">Pending sync</p>
            ) : (
              <p className="text-5xl font-extrabold text-indigo-600 leading-tight">{tableNumber ?? "—"}</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full bg-[#00428E] hover:bg-[#003578] text-white text-base font-semibold px-6 py-3 rounded-lg transition"
        >
          OK ({secondsLeft})
        </button>
      </div>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path
        d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
        className="animate-check-circle-stroke"
        style={{ strokeDasharray: 66, strokeDashoffset: 66 }}
      />
      <polyline
        points="22 4 12 14.01 9 11.01"
        className="animate-check-tick-stroke"
        style={{ strokeDasharray: 24, strokeDashoffset: 24 }}
      />
    </svg>
  );
}

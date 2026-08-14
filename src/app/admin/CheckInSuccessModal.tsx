"use client";

import { useEffect, useState } from "react";
import { checkInStatusBgClass, checkInStatusTextClass } from "@/lib/checkinStatus";
import type { CheckInStatus } from "@/db/schema";

const AUTO_DISMISS_SECONDS = 10;

export function CheckInSuccessModal({
  firstName,
  lastName,
  tableNumber,
  showTable = true,
  status = "On-time",
  onDismiss,
}: {
  firstName: string;
  lastName: string;
  tableNumber: number | null;
  showTable?: boolean;
  status?: CheckInStatus;
  onDismiss: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-1 text-center">
        <div className={`w-20 h-20 rounded-full ${checkInStatusBgClass(status)} flex items-center justify-center mb-3 animate-check-circle-pop`}>
          <CheckCircleIcon className={checkInStatusTextClass(status)} />
        </div>
        <p className="text-xl font-bold text-gray-900">You&rsquo;re checked in, {firstName}!</p>
        <p className="text-sm text-gray-500">{lastName} &middot; Welcome!</p>

        {showTable && (
          <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-6 py-5 flex flex-col items-center gap-1 mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Your Table</p>
            <p className="text-5xl font-extrabold text-indigo-600 leading-tight">{tableNumber ?? "—"}</p>
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

"use client";

import { useTransition } from "react";
import { checkInParticipant, removeCheckIn } from "./actions";

interface ParticipantWithStatus {
  id: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  mobileNumber: string;
  lifestage: string;
  preferredNameOnId: string;
  checkInId: number | null;
  checkedInAt: Date | null;
}

function CheckInRow({ p, sessionId, onAction }: { p: ParticipantWithStatus; sessionId: number; onAction?: () => void }) {
  const [pending, startTransition] = useTransition();
  const isCheckedIn = p.checkInId != null;

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
      isCheckedIn ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
    }`}>
      <div>
        <p className="font-semibold text-gray-900 text-sm">
          {p.lastName}, {p.firstName}{p.middleInitial ? ` ${p.middleInitial}.` : ""}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {p.mobileNumber} · {p.lifestage}
        </p>
        {isCheckedIn && p.checkedInAt && (
          <p className="text-xs text-green-600 mt-0.5">
            Checked in at{" "}
            {new Date(p.checkedInAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isCheckedIn ? (
          <>
            <span className="text-green-600 font-semibold text-xs">✓ Done</span>
            <button
              onClick={() => {
                if (!confirm(`Remove check-in for ${p.firstName} ${p.lastName}?`)) return;
                startTransition(async () => { await removeCheckIn(p.id, sessionId); onAction?.(); });
              }}
              disabled={pending}
              className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
            >
              Undo
            </button>
          </>
        ) : (
          <button
            onClick={() => startTransition(async () => { await checkInParticipant(p.id, sessionId); onAction?.(); })}
            disabled={pending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
          >
            Check In
          </button>
        )}
      </div>
    </div>
  );
}

export function SessionCheckInList({
  participants,
  sessionId,
  onAction,
}: {
  participants: ParticipantWithStatus[];
  sessionId: number;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        {participants.length} result{participants.length !== 1 ? "s" : ""}
      </p>
      {participants.map((p) => (
        <CheckInRow key={p.id} p={p} sessionId={sessionId} onAction={onAction} />
      ))}
    </div>
  );
}

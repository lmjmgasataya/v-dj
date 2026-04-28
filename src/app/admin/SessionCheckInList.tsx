"use client";

import { useTransition } from "react";
import { checkInParticipant, removeCheckIn } from "./actions";

interface ParticipantWithStatus {
  id: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  mobileNumber: string | null;
  lifestage: string | null;
  gender: string;
  preferredNameOnId: string | null;
  isWalkIn: boolean;
  victoryDate: string | null;
  victoryDayDate: string | null;
  completedVictoryDay: boolean;
  checkInId: number | null;
  checkedInAt: Date | null;
}

function CheckInRow({ p, sessionId, isVictoryDay, onAction }: { p: ParticipantWithStatus; sessionId: number; isVictoryDay: boolean; onAction?: () => void }) {
  const [pending, startTransition] = useTransition();
  const isCheckedIn = p.checkInId != null;
  const hasVictoryDay = p.isWalkIn ? !!p.victoryDate : p.completedVictoryDay;
  const isIncomplete = !p.isWalkIn && !!p.victoryDayDate && !p.completedVictoryDay;
  const blocked = !isVictoryDay && !hasVictoryDay;

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
      isCheckedIn ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
    }`}>
      <div>
        <p className="font-semibold text-gray-900 text-sm">
          {p.gender === "Male" ? "👨🏻" : "👩🏻"}{" "}
          {p.lastName}, {p.firstName}{p.middleInitial ? ` ${p.middleInitial}.` : ""}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {p.mobileNumber} · {p.lifestage}
        </p>
        {(() => {
          const vd = p.isWalkIn ? p.victoryDate : p.victoryDayDate;
          if (!vd) return (
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
              Victory Day: —
            </span>
          );
          if (isIncomplete) return (
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Victory Day: {vd} (Incomplete)
            </span>
          );
          return (
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              Victory Day: {vd}
            </span>
          );
        })()}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isCheckedIn ? (
          <>
            <div className="flex flex-col items-end gap-1">
              <span className="text-green-600 font-semibold text-xs">✓ Done</span>
              {p.checkedInAt && (
                <span className="text-xs text-green-500">
                  {new Date(p.checkedInAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
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
        ) : blocked ? (
          <span className="text-xs text-gray-400 italic">
            {isIncomplete ? "Incomplete" : "No Victory Day yet"}
          </span>
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
  isVictoryDay,
  onAction,
}: {
  participants: ParticipantWithStatus[];
  sessionId: number;
  isVictoryDay: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        {participants.length} result{participants.length !== 1 ? "s" : ""}
      </p>
      {participants.map((p) => (
        <CheckInRow key={p.id} p={p} sessionId={sessionId} isVictoryDay={isVictoryDay} onAction={onAction} />
      ))}
    </div>
  );
}

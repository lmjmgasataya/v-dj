"use client";

import { useTransition } from "react";
import { checkInParticipant, removeCheckIn } from "./actions";
import type { Participant, ClassSession, CheckIn } from "@/db/schema";

interface Props {
  participant: Participant;
  sessions: ClassSession[];
  checkIns: (CheckIn & { sessionName: string; sessionDate: string })[];
  hasVictoryDay: boolean;
}

export function CheckInPanel({ participant, sessions, checkIns, hasVictoryDay }: Props) {
  const checkedInIds = new Set(checkIns.map((c) => c.classSessionId));
  const [pending, startTransition] = useTransition();

  function handleCheckIn(sessionId: number) {
    startTransition(() => checkInParticipant(participant.id, sessionId));
  }

  function handleUndo(sessionId: number, sessionName: string) {
    if (!confirm(`Remove check-in for "${sessionName}"?\n\nThis will unlock the session and the participant will need to be checked in again.`)) return;
    startTransition(() => removeCheckIn(participant.id, sessionId));
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Participant summary */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4">
        <p className="text-xs text-indigo-400 uppercase tracking-widest font-medium">Selected Participant</p>
        <h3 className="text-lg font-bold text-gray-900 mt-0.5">
          {participant.lastName}, {participant.firstName}{" "}
          {participant.middleInitial ? `${participant.middleInitial}.` : ""}
        </h3>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
          <span>📱 {participant.mobileNumber}</span>
          <span>🎂 Age {participant.age}</span>
          <span>🙏 {participant.lifestage}</span>
          <span>💵 {participant.registrationFee} fee</span>
        </div>
        <div className="mt-1 text-sm text-gray-600">
          <span>ID Name: <strong>{participant.preferredNameOnId}</strong></span>
          <span className="mx-3">|</span>
          <span>Receipt: <strong>{participant.acknowledgementReceiptNumber}</strong></span>
        </div>
      </div>

      {/* Sessions */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Class Sessions</h4>
        {!hasVictoryDay && (() => {
          const victorySessions = sessions.filter((s) => s.isVictoryDay);
          const attended = victorySessions.filter((s) => checkedInIds.has(s.id));
          const missing = victorySessions.filter((s) => !checkedInIds.has(s.id));
          const hasPartial = attended.length > 0;

          return (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">
                {hasPartial
                  ? "Victory Day not yet complete"
                  : "Victory Day required"}
              </p>
              <p className="mt-1 text-amber-700">
                {hasPartial
                  ? `Still needs to attend: ${missing.map((s) => s.name.includes("Morning") ? "Morning" : "Afternoon").join(" and ")} session${missing.length > 1 ? "s" : ""}.`
                  : "Both the Morning and Afternoon sessions of Victory Day (July 25) must be completed before other sessions are unlocked."}
              </p>
            </div>
          );
        })()}
        <div className="flex flex-col gap-2">
          {sessions.map((session) => {
            const isCheckedIn = checkedInIds.has(session.id);
            const isLocked = !session.isVictoryDay && !hasVictoryDay;
            const checkIn = checkIns.find((c) => c.classSessionId === session.id);
            const dateStr = new Date(session.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={session.id}
                className={`flex items-center justify-between rounded-lg px-4 py-3 border text-sm ${
                  isCheckedIn
                    ? "bg-green-50 border-green-200"
                    : isLocked
                    ? "bg-gray-50 border-gray-200 opacity-60"
                    : "bg-white border-gray-200"
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">{session.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
                  {isCheckedIn && checkIn && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Checked in at{" "}
                      {new Date(checkIn.checkedInAt).toLocaleTimeString("en-PH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                {isCheckedIn ? (
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-green-600 font-semibold text-xs">✓ Done</span>
                    <button
                      onClick={() => handleUndo(session.id, session.name)}
                      disabled={pending}
                      className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
                    >
                      Undo
                    </button>
                  </div>
                ) : isLocked ? (
                  <span className="text-gray-400 text-xs shrink-0">🔒 Locked</span>
                ) : (
                  <button
                    onClick={() => handleCheckIn(session.id)}
                    disabled={pending}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
                  >
                    Check In
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

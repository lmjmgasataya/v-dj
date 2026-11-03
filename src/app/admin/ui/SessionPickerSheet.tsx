"use client";

import { useId } from "react";
import type { ClassSession } from "@/db/schema";
import { todayPH } from "@/lib/date";
import { Sheet } from "./Sheet";
import { CheckIcon, CloseIcon } from "./icons";
import { Tag } from "./StatusPill";

export function formatSessionDate(s: ClassSession, weekday: "short" | "long" = "short") {
  return new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
    weekday, month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  });
}

export function SessionTags({ session }: { session: ClassSession }) {
  const today = session.sessionDate === todayPH();
  if (!today && !session.isVictoryDay && !session.vglOnly && !session.allowsWalkIn) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {today && <Tag tone="blue">Today</Tag>}
      {session.isVictoryDay && <Tag>Victory Day</Tag>}
      {session.vglOnly && <Tag tone="amber">VGLs only</Tag>}
      {session.allowsWalkIn && <Tag>Walk-ins</Tag>}
    </span>
  );
}

export function SessionPickerSheet({
  sessions,
  selectedId,
  batchName,
  attendeeCounts,
  onSelect,
  onClose,
}: {
  sessions: ClassSession[];
  selectedId: number | null;
  batchName?: string;
  attendeeCounts: Record<number, number>;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Sheet labelledBy={titleId} onClose={onClose} dismissOnBackdrop wide>
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 pt-3 pb-3 sm:pt-4">
        <div>
          <h3 id={titleId} className="text-lg font-semibold text-gray-900">Choose a session</h3>
          {batchName && <p className="text-sm text-gray-600">{batchName}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 flex size-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        >
          <CloseIcon />
        </button>
      </div>
      {sessions.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-600">No sessions in this batch yet. Add one under Sessions.</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {sessions.map((s) => {
            const selected = s.id === selectedId;
            const count = attendeeCounts[s.id] ?? 0;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-current={selected ? "true" : undefined}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 ${selected ? "bg-[#00428E]/5" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block font-medium ${selected ? "text-[#00428E]" : "text-gray-900"}`}>{s.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                      {formatSessionDate(s)}
                      <SessionTags session={s} />
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm text-gray-600 tabular-nums">
                    {count > 0 && <>{count} in</>}
                  </span>
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    {selected && <CheckIcon className="size-5 text-[#00428E]" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

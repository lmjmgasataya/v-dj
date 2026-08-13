"use client";

import { useState } from "react";
import Link from "next/link";
import { toTitleCase } from "@/lib/text";

export interface ParticipantsCellEntry {
  id: number;
  lastName: string;
  firstName: string;
  relation: "discipler" | "vg_leader";
}

interface Props {
  participants: ParticipantsCellEntry[];
}

const RELATION_LABEL: Record<ParticipantsCellEntry["relation"], string> = {
  discipler: "Discipler",
  vg_leader: "VG Leader",
};

const RELATION_BADGE_CLASS: Record<ParticipantsCellEntry["relation"], string> = {
  discipler: "bg-amber-50 text-amber-700",
  vg_leader: "bg-blue-50 text-blue-700",
};

export function ParticipantsCell({ participants }: Props) {
  const [open, setOpen] = useState(false);

  if (participants.length === 0) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
      >
        {participants.length} participant{participants.length !== 1 ? "s" : ""}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 left-0 top-full mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            {participants.map((p) => (
              <Link
                key={`${p.relation}-${p.id}`}
                href={`/participants/${p.id}/edit`}
                className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              >
                <span className="truncate">{toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}</span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${RELATION_BADGE_CLASS[p.relation]}`}>
                  {RELATION_LABEL[p.relation]}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

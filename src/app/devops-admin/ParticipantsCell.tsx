"use client";

import { useState } from "react";
import Link from "next/link";
import { toTitleCase } from "@/lib/text";

interface Props {
  participants: { id: number; lastName: string; firstName: string }[];
}

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
          <div className="absolute z-50 left-0 top-full mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            {participants.map((p) => (
              <Link
                key={p.id}
                href={`/participants/${p.id}/edit`}
                className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 truncate"
              >
                {toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

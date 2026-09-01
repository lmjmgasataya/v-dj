"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function updateRect() {
      const el = buttonRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom, left: r.left, width: r.width });
    }

    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  if (participants.length === 0) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
      >
        {participants.length} participant{participants.length !== 1 ? "s" : ""}
      </button>

      {open && rect && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              style={{ position: "fixed", top: rect.top, left: rect.left, width: Math.max(rect.width, 256) }}
              className="z-50 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1"
            >
              {participants.map((p) => (
                <Link
                  key={`${p.relation}-${p.id}`}
                  href={`/participants/${p.id}/edit`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                >
                  <span className="truncate">{toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${RELATION_BADGE_CLASS[p.relation]}`}>
                    {RELATION_LABEL[p.relation]}
                  </span>
                </Link>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

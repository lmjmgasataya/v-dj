"use client";

import { useTransition } from "react";
import { restoreParticipant } from "../[id]/edit/actions";

export function RestoreButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Restore "${name}"? They will appear in the participants list again.`)) return;
    startTransition(() => restoreParticipant(id));
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
    >
      {pending ? "Restoring..." : "Restore"}
    </button>
  );
}

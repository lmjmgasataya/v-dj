"use client";

import { useState, useTransition } from "react";
import { hardDeleteVgLeader } from "./actions";

export function HardDeleteButton({ id, name, disabled }: { id: number; name: string; disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Permanently delete "${name}" (#${id})?\n\nThis can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await hardDeleteVgLeader(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        onClick={handleClick}
        disabled={disabled || pending}
        title={disabled ? "Move or remove the remaining connections first." : undefined}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Deleting..." : "Delete permanently"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

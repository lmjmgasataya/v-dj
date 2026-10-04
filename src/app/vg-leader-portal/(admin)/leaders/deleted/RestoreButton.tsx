"use client";

import { useState, useTransition } from "react";
import { restoreVgLeader } from "./actions";

export function RestoreButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !confirm(
        `Restore "${name}" (#${id})?\n\n` +
          "They will appear in the VG leaders list and autocompletes again. " +
          "If this record was removed by a merge, restoring it brings back the duplicate.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await restoreVgLeader(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="whitespace-nowrap rounded-lg bg-[#00428E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#003578] disabled:opacity-50"
      >
        {pending ? "Restoring..." : "Restore"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

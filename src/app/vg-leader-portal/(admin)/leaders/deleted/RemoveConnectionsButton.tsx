"use client";

import { useState, useTransition } from "react";
import { removeVgLeaderConnections } from "./actions";

export function RemoveConnectionsButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !confirm(
        `Remove all connections of "${name}" (#${id})?\n\n` +
          "• Participants and VG leaders linked to them are unlinked (their records stay).\n" +
          "• Event check-ins are kept but no longer linked to them.\n" +
          "• Leadership group links and event registrations are deleted.\n" +
          "• Their victory/leadership groups, those groups' interns, and their portal account are deleted.\n\n" +
          "This can't be undone.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await removeVgLeaderConnections(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="whitespace-nowrap rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Removing..." : "Remove connections"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

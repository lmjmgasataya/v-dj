"use client";

import { useState, useTransition } from "react";
import { moveVgLeaderConnections } from "../../mergeActions";

export function MoveConnectionsButton({
  fromId,
  fromName,
  toId,
  toName,
}: {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !confirm(
        `Move all connections of "${fromName}" (#${fromId}) to "${toName}" (#${toId})?\n\n` +
          "Participants, VG leaders and leadership group links pointing at this record will point at the other one instead. " +
          "This record itself is not deleted.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await moveVgLeaderConnections(fromId, toId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
      >
        {pending ? "Moving..." : `Move connections to ${toName} (#${toId})`}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

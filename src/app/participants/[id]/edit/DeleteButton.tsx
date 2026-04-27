"use client";

import { useTransition } from "react";
import { deleteParticipant } from "./actions";

export function DeleteButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete "${name}"?\n\nThis is a soft delete — you can restore them later from the Deleted Participants page.`)) return;
    startTransition(() => deleteParticipant(id));
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-red-500 hover:text-red-700 underline disabled:opacity-50"
    >
      {pending ? "Deleting..." : "Delete participant"}
    </button>
  );
}

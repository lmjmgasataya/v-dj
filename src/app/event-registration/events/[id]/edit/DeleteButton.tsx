"use client";

import { useTransition } from "react";
import { deleteEvent } from "./actions";

export function DeleteButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete "${name}"?\n\nThis is a soft delete — the record can be restored if needed.`)) return;
    startTransition(() => deleteEvent(id));
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-red-500 hover:text-red-700 underline disabled:opacity-50 self-start"
    >
      {pending ? "Deleting..." : "Delete event"}
    </button>
  );
}

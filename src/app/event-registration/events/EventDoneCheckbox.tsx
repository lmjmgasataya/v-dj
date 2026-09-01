"use client";

import { useState, useTransition } from "react";
import { toggleEventDone } from "./actions";

export function EventDoneCheckbox({ id, name, isDone }: { id: number; name: string; isDone: boolean }) {
  const [checked, setChecked] = useState(isDone);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (next && !confirm(`Mark "${name}" as done?`)) return;
    setChecked(next);
    startTransition(() => toggleEventDone(id, next));
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      disabled={pending}
      title={checked ? "Mark as upcoming" : "Mark as done"}
      className="w-5 h-5 rounded border-gray-300 text-[#00428E] focus:ring-indigo-400 shrink-0 cursor-pointer disabled:opacity-50"
    />
  );
}

"use client";

import { useState, useTransition } from "react";
import { SERVICE_OPTIONS } from "@/components/form";
import { updateWorshipService } from "./actions";

export function WorshipServiceSelect({ id, value }: { id: number; value: string | null }) {
  const [current, setCurrent] = useState(value ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    setSaved(false);
    startTransition(async () => {
      await updateWorshipService(id, next || null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={current}
        onChange={handleChange}
        disabled={isPending}
        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50 cursor-pointer"
      >
        <option value="">— not set —</option>
        {SERVICE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {isPending && <span className="text-xs text-gray-400">saving…</span>}
      {!isPending && saved && <span className="text-xs text-green-600">✓ saved</span>}
    </div>
  );
}

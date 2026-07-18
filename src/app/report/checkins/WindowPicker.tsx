"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CHECKIN_WINDOW_OPTIONS } from "@/lib/constants";

export function WindowPicker({ windowMinutes }: { windowMinutes: number }) {
  const router = useRouter();
  const params = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = new URLSearchParams(params.toString());
    p.set("window", e.target.value);
    router.push(`/report/checkins?${p.toString()}`);
  }

  return (
    <select
      value={windowMinutes}
      onChange={handleChange}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {CHECKIN_WINDOW_OPTIONS.map((m) => (
        <option key={m} value={m}>
          {m} min
        </option>
      ))}
    </select>
  );
}

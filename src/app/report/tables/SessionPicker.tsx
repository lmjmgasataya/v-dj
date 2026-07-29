"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Session {
  id: number;
  name: string;
  sessionDate: string;
}

export function SessionPicker({
  sessions,
  selectedId,
}: {
  sessions: Session[];
  selectedId: number | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = new URLSearchParams(params.toString());
    if (e.target.value) p.set("session", e.target.value);
    else p.delete("session");
    router.push(`/report/tables?${p.toString()}`);
  }

  return (
    <select
      value={selectedId ?? ""}
      onChange={handleChange}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[280px]"
    >
      <option value="">-- Select a session --</option>
      {sessions.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} — {new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
            month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
          })}
        </option>
      ))}
    </select>
  );
}

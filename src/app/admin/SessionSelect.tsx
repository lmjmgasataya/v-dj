"use client";

import { useRouter } from "next/navigation";
import type { ClassSession } from "@/db/schema";

export function SessionSelect({
  sessions,
  selectedId,
}: {
  sessions: ClassSession[];
  selectedId: number | null;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        router.push(val ? `/admin?session=${val}` : "/admin");
      }}
      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
    >
      <option value="">-- Select a session --</option>
      {sessions.map((s) => {
        const dateStr = new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
          weekday: "short", month: "short", day: "numeric", year: "numeric",
        });
        return (
          <option key={s.id} value={s.id}>
            {s.name} — {dateStr}{s.isVictoryDay ? " (Victory Day)" : ""}
          </option>
        );
      })}
    </select>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { ClassSession } from "@/db/schema";

export function SessionSelect({
  sessions,
  selectedId,
}: {
  sessions: ClassSession[];
  selectedId: number | null;
}) {
  const router = useRouter();
  const currentParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative">
    <select
      value={selectedId ?? ""}
      disabled={isPending}
      onChange={(e) => {
        const val = e.target.value;
        const params = new URLSearchParams(currentParams.toString());
        if (val) {
          params.set("session", val);
        } else {
          params.delete("session");
        }
        startTransition(() => {
          router.push(`/admin?${params.toString()}`);
        });
      }}
      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-60"
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
    {isPending && (
      <div className="absolute inset-y-0 right-8 flex items-center">
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )}
    </div>
  );
}

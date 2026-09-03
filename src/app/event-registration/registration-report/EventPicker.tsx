"use client";

import { useRouter } from "next/navigation";
import { selectCls } from "@/components/form";

type EventOption = { id: number; name: string; eventDate: string };

export function EventPicker({ events, selectedEventId }: { events: EventOption[]; selectedEventId: number | null }) {
  const router = useRouter();

  function dateLabel(eventDate: string) {
    return new Date(eventDate + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Event</span>
      <select
        value={selectedEventId ?? ""}
        onChange={(e) => router.push(`/event-registration/registration-report?event=${e.target.value}`)}
        className={`${selectCls} max-w-md`}
      >
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name} — {dateLabel(e.eventDate)}
          </option>
        ))}
      </select>
    </div>
  );
}

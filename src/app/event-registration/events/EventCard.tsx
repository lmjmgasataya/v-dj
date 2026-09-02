"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EventDoneCheckbox } from "./EventDoneCheckbox";
import { getEventShareToken } from "./actions";
import { useToast } from "@/components/toast/ToastProvider";

const AUDIENCE_LABEL: Record<string, string> = {
  vg_leader: "VG Leaders",
  intern: "Interns",
};

interface EventRow {
  id: number;
  name: string;
  eventDate: string;
  isDone: boolean;
  audience: ("vg_leader" | "intern")[];
  checkedInCount: number;
  preregisteredCount: number;
}

export function EventCard({ event: e, isDeveloper }: { event: EventRow; isDeveloper: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [copying, setCopying] = useState(false);

  const dateStr = new Date(e.eventDate + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  async function handleCopyLink() {
    setCopying(true);
    try {
      const token = await getEventShareToken(e.id);
      const url = `${window.location.origin}/vg-portal/events/${token}`;
      await navigator.clipboard.writeText(url);
      toast.show("Link copied to clipboard.", "success");
    } catch {
      toast.show("Couldn't copy the link.", "error");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div
      onClick={() => router.push(`/event-registration/events/${e.id}`)}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition"
    >
      <div onClick={(ev) => ev.stopPropagation()}>
        <EventDoneCheckbox id={e.id} name={e.name} isDone={e.isDone} />
      </div>
      <div className="flex-1 flex items-center justify-between min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{e.name}</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                e.isDone ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"
              }`}
            >
              {e.isDone ? "Done" : "Upcoming"}
            </span>
            {e.audience.map((a) => (
              <span key={a} className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {AUDIENCE_LABEL[a] ?? a}
              </span>
            ))}
          </div>
          <span className="text-sm text-gray-500">{dateStr}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-600">{e.preregisteredCount}</p>
            <p className="text-xs text-gray-400">preregistered</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">{e.checkedInCount}</p>
            <p className="text-xs text-gray-400">checked in</p>
          </div>
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              handleCopyLink();
            }}
            disabled={copying}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline disabled:opacity-50 shrink-0"
          >
            {copying ? "Copying..." : "Copy Link"}
          </button>
          {isDeveloper && (
            <Link
              href={`/event-registration/events/${e.id}/edit`}
              onClick={(ev) => ev.stopPropagation()}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Edit
            </Link>
          )}
          <span className="text-gray-300">›</span>
        </div>
      </div>
    </div>
  );
}

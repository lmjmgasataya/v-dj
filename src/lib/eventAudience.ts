import type { eventAudienceEnum } from "@/db/schema";

export type EventAudience = (typeof eventAudienceEnum.enumValues)[number];

export const EVENT_AUDIENCE_LABEL: Record<EventAudience, string> = {
  vg_leader: "VG Leaders",
  leadership_group_leader: "Leadership Group Leaders",
  intern: "Interns",
};

/** Audience checkboxes on the new/edit event forms, in display order. */
export const EVENT_AUDIENCE_OPTIONS: { value: EventAudience; label: string }[] = [
  { value: "vg_leader", label: "Victory Group Leaders" },
  { value: "leadership_group_leader", label: "Leadership Group Leaders" },
  { value: "intern", label: "Interns" },
];

/**
 * Leadership Group Leaders are VG leaders too, so either audience means VG leaders register
 * through the VGL link — the LGL audience just narrows who may.
 */
export function hasLeaderAudience(audience: EventAudience[]): boolean {
  return audience.includes("vg_leader") || audience.includes("leadership_group_leader");
}

/** False only for an event meant for Leadership Group Leaders when this leader isn't one. */
export function isEventOpenToLeader(audience: EventAudience[], isLeadershipGroupLeader: boolean): boolean {
  if (audience.includes("leadership_group_leader") && !audience.includes("vg_leader")) return isLeadershipGroupLeader;
  return true;
}

/** "18:30" -> "6:30 PM". */
function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "6:30 PM – 9:00 PM", just the start time when there's no end, or null when no time is set. */
export function formatEventTimeRange(startTime: string | null, endTime: string | null): string | null {
  if (!startTime) return null;
  return endTime ? `${formatTime(startTime)} – ${formatTime(endTime)}` : formatTime(startTime);
}

/** Reads the optional From/To times off the event form; an error message when they don't make sense. */
export function parseEventTimes(formData: FormData): { startTime: string | null; endTime: string | null; error?: string } {
  const startTime = (formData.get("startTime") as string) || null;
  const endTime = (formData.get("endTime") as string) || null;
  if (endTime && !startTime) return { startTime, endTime, error: "Set a start time for the event, or clear the end time." };
  // "HH:MM" strings compare correctly as text.
  if (startTime && endTime && endTime <= startTime) return { startTime, endTime, error: "The end time must be after the start time." };
  return { startTime, endTime };
}

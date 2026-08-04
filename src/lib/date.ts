import type { CheckInStatus } from "@/db/schema";

const TZ = "Asia/Manila";

export function todayPH(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function currentYearPH(): number {
  return parseInt(todayPH().slice(0, 4), 10);
}

const ON_TIME_CUTOFF_MINUTES = 9 * 60; // 9:00 AM
const LATE_CUTOFF_MINUTES = 9 * 60 + 15; // 9:15 AM

function minutesSinceMidnightPH(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** On or before 9:00 AM -> On-time, up to 9:15 AM -> Late, after that -> Absent (Asia/Manila time). */
export function checkInStatusForDate(date: Date): CheckInStatus {
  const minutes = minutesSinceMidnightPH(date);
  if (minutes <= ON_TIME_CUTOFF_MINUTES) return "On-time";
  if (minutes <= LATE_CUTOFF_MINUTES) return "Late";
  return "Absent";
}

export function isOnTimeWindow(date: Date = new Date()): boolean {
  return minutesSinceMidnightPH(date) <= ON_TIME_CUTOFF_MINUTES;
}

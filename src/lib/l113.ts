import type { CheckInStatus } from "@/db/schema";
import { TZ } from "@/lib/date";

/** QR value on a student's L113 code (VG portal → L113, and /l113-portal/qr-codes). */
export const L113_QR_PREFIX = "dj:vgl:";

/** A student's L113 page on the VG Leader Portal (QR code, schedule, attendance). */
export const STUDENT_L113_PATH = "/vg-portal/l113";
/**
 * Public forms, one link for everyone (like a Google Form): no login, students pick their
 * own name. Admins copy these from the L113 Portal.
 */
export const STUDENT_SPIRITUAL_DISCIPLINES_PATH = "/l113/spiritual-disciplines";
export const STUDENT_TEACHER_EVALUATION_PATH = "/l113/teacher-evaluation";
export const STUDENT_EVALUATION_FORM_PATH = "/l113/student-evaluation";

/** Name picker value on the public forms: "<batchId>:<vgLeaderId>". */
export function l113StudentKey(batchId: number, vgLeaderId: number): string {
  return `${batchId}:${vgLeaderId}`;
}

export function parseL113StudentKey(key: string): { batchId: number; vgLeaderId: number } | null {
  const m = /^(\d+):(\d+)$/.exec(key);
  return m ? { batchId: Number(m[1]), vgLeaderId: Number(m[2]) } : null;
}

export function l113QrValue(vgLeaderId: number): string {
  return `${L113_QR_PREFIX}${vgLeaderId}`;
}

export function parseL113Qr(text: string): number | null {
  if (!text.startsWith(L113_QR_PREFIX)) return null;
  const n = parseInt(text.slice(L113_QR_PREFIX.length), 10);
  return Number.isNaN(n) ? null : n;
}

const ON_TIME_CUTOFF_MINUTES = 9 * 60; // 9:00 AM
const LATE_CUTOFF_MINUTES = 9 * 60 + 10; // 9:10 AM

function minutesSinceMidnightPH(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * L113 class check-in: on or before 9:00 AM → On Time, after 9:00 until 9:10 AM → Late, after
 * that → Absent (Asia/Manila). A student with no check-in by the end of the class day is Absent too.
 */
export function l113CheckInStatus(date: Date): CheckInStatus {
  const minutes = minutesSinceMidnightPH(date);
  if (minutes <= ON_TIME_CUTOFF_MINUTES) return "On-time";
  if (minutes <= LATE_CUTOFF_MINUTES) return "Late";
  return "Absent";
}

export const L113_STATUS_LABEL: Record<CheckInStatus, string> = {
  "On-time": "On Time",
  Late: "Late",
  Absent: "Absent",
};

/** "2026-11-19" → "Nov 19, 2026" */
export function formatL113Date(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: TZ });
}

/**
 * Class dates the way the printed calendar writes them: "January 10 and 17",
 * "June 27 and July 4", "May 23, 30 and June 6". The month shows only when it changes.
 */
export function formatScheduleDates(isoDates: string[]): string {
  const parts = isoDates.map((d, i) => {
    const day = String(Number(d.slice(8, 10)));
    if (i > 0 && isoDates[i - 1].slice(0, 7) === d.slice(0, 7)) return day;
    const month = new Date(d + "T00:00:00").toLocaleDateString("en-PH", { month: "long", timeZone: TZ });
    return `${month} ${day}`;
  });
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** "2026-11" → "November 2026" */
export function formatMonth(month: string): string {
  return new Date(month + "-01T00:00:00").toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: TZ });
}

/** Every "YYYY-MM" from the batch's start month to its end month. */
export function batchMonths(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  let y = Number(startDate.slice(0, 4));
  let m = Number(startDate.slice(5, 7));
  const endKey = endDate.slice(0, 7);
  for (let i = 0; i < 60; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    months.push(key);
    if (key >= endKey) break;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

/** The current month if it's within the batch, else the batch's last month (or first, before it starts). */
export function defaultBatchMonth(months: string[], today: string): string {
  const current = today.slice(0, 7);
  if (months.includes(current)) return current;
  return current < months[0] ? months[0] : months[months.length - 1];
}

export const TEACHER_EVAL_QUESTIONS = [
  { key: "preparedRating", label: "The teacher/facilitator was prepared for the class and presented the materials in an organized manner" },
  { key: "clarityRating", label: "The teacher/facilitator was clear in explaining concepts and giving instructions" },
  { key: "responsivenessRating", label: "The teacher/facilitator responded effectively to student’s questions and comments" },
] as const;

export const TEACHER_EVAL_FEEDBACK_QUESTION =
  "What did you like about the teacher or facilitator? How can he/she continue to improve?";

export const RATING_SCALE = [1, 2, 3, 4, 5] as const;
export const RATING_LABEL: Record<number, string> = {
  1: "Strongly disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly agree",
};

export const SPIRITUAL_DISCIPLINE_QUESTIONS = [
  { key: "chaptersRead", label: "How many chapters have you read this month?" },
  { key: "daysReadFourChapters", label: "How many days have you read at least four chapters this month?" },
  { key: "peopleLedToChrist", label: "How many people have you personally led to Christ this month?" },
  { key: "prayerMeetingsAttended", label: "How many prayer meetings have you attended this month?" },
] as const;

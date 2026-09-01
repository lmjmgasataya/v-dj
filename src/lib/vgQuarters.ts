import { currentYearPH, currentMonthPH, monthYearPH } from "@/lib/date";

export type QuarterCardStatus = "updated" | "incomplete" | "not_updated";

export interface QuarterCard {
  key: string;
  label: string;
  status: QuarterCardStatus;
  percent: number | null;
  clickable: boolean;
}

const QUARTER_DEFS = [
  { key: "q1", label: "Q1", startMonth: 1, endMonth: 3 },
  { key: "q2", label: "Q2", startMonth: 4, endMonth: 6 },
  { key: "q3", label: "Q3", startMonth: 7, endMonth: 9 },
];

/**
 * VG leaders are expected to confirm/update their profile once per quarter (only
 * Jan-Mar / Apr-Jun / Jul-Sep count — there's no Q4 checkpoint, matching the
 * "3x/year" cadence). Each quarter's card status:
 * - already ended -> "updated" (the window is closed, no point re-litigating it)
 * - not yet started -> "not_updated" (grayed, nothing to do yet)
 * - the live quarter -> derived from whether `updatedAt` falls within it and
 *   whether the profile is 100% complete; only this one is ever clickable.
 */
export function getProfileUpdateQuarters(updatedAt: Date, profilePercent: number): QuarterCard[] {
  const year = currentYearPH();
  const month = currentMonthPH();
  const updated = monthYearPH(updatedAt);

  return QUARTER_DEFS.map((q) => {
    const label = `${q.label} ${year}`;

    if (month > q.endMonth) {
      return { key: q.key, label, status: "updated" as const, percent: null, clickable: false };
    }
    if (month < q.startMonth) {
      return { key: q.key, label, status: "not_updated" as const, percent: null, clickable: false };
    }

    const updatedThisQuarter =
      updated.year === year && updated.month >= q.startMonth && updated.month <= q.endMonth;

    if (updatedThisQuarter && profilePercent === 100) {
      return { key: q.key, label, status: "updated" as const, percent: null, clickable: true };
    }
    if (updatedThisQuarter) {
      return { key: q.key, label, status: "incomplete" as const, percent: profilePercent, clickable: true };
    }
    return { key: q.key, label, status: "not_updated" as const, percent: null, clickable: true };
  });
}

import { currentYearPH, currentMonthPH, monthYearPH } from "@/lib/date";

export type QuarterCardStatus = "updated" | "incomplete" | "not_updated";

export interface QuarterCard {
  key: string;
  label: string;
  status: QuarterCardStatus;
  percent: number | null;
  clickable: boolean;
  /** The current calendar quarter — reports key off this, since `clickable` can also be true for the grace-period quarter. */
  live: boolean;
  /** Month range shown under the label, e.g. "Jul–Sep". */
  months: string;
}

/** featureFlags key: when on, VG leaders can still update the quarter that just ended (e.g. Q3 during October–December). */
export const ACCEPT_PREVIOUS_QUARTER_FLAG = "vgl_accept_previous_quarter";

const QUARTER_DEFS = [
  { key: "q1", label: "Q1", startMonth: 1, endMonth: 3, months: "Jan–Mar" },
  { key: "q2", label: "Q2", startMonth: 4, endMonth: 6, months: "Apr–Jun" },
  { key: "q3", label: "Q3", startMonth: 7, endMonth: 9, months: "Jul–Sep" },
  { key: "q4", label: "Q4", startMonth: 10, endMonth: 12, months: "Oct–Dec" },
];

/**
 * VG leaders are expected to confirm/update their profile once per quarter
 * (Jan-Mar / Apr-Jun / Jul-Sep / Oct-Dec — a "4x/year" cadence). Each quarter's
 * card status:
 * - already ended -> "updated" (the window is closed, no point re-litigating it)
 * - not yet started -> "not_updated" (grayed, nothing to do yet)
 * - the live quarter -> derived from whether `updatedAt` falls within it and
 *   whether the profile is 100% complete; only this one is clickable.
 *
 * With `acceptPreviousQuarter` on, the quarter that just ended stays open too:
 * it's clickable and its status counts any update made since it started (so an
 * October update still satisfies Q3). In Jan-Mar that's last year's Q4, which
 * gets its own card ahead of Q1.
 */
/** The current live quarter checkpoint. Every month now falls in one of Q1-Q4, so this is never null in practice — the null case is kept only as a defensive fallback. */
export function getLiveQuarter(): { key: string; label: string } | null {
  const year = currentYearPH();
  const month = currentMonthPH();
  const q = QUARTER_DEFS.find((q) => month >= q.startMonth && month <= q.endMonth);
  return q ? { key: q.key, label: `${q.label} ${year}` } : null;
}

export function getProfileUpdateQuarters(
  updatedAt: Date,
  profilePercent: number,
  { acceptPreviousQuarter = false }: { acceptPreviousQuarter?: boolean } = {},
): QuarterCard[] {
  const year = currentYearPH();
  const month = currentMonthPH();
  const updated = monthYearPH(updatedAt);
  const liveIndex = QUARTER_DEFS.findIndex((q) => month >= q.startMonth && month <= q.endMonth);

  // Open quarter: status comes from whether the profile was touched on or after its start.
  // For the live quarter that's the same as "within it", since updatedAt can't be in the future.
  function openCard(q: (typeof QUARTER_DEFS)[number], qYear: number, live: boolean): QuarterCard {
    const base = { key: q.key, label: `${q.label} ${qYear}`, months: q.months, clickable: true, live };
    const updatedSinceStart =
      updated.year > qYear || (updated.year === qYear && updated.month >= q.startMonth);

    if (updatedSinceStart && profilePercent === 100) return { ...base, status: "updated", percent: null };
    if (updatedSinceStart) return { ...base, status: "incomplete", percent: profilePercent };
    return { ...base, status: "not_updated", percent: null };
  }

  const cards = QUARTER_DEFS.map((q, i): QuarterCard => {
    const label = `${q.label} ${year}`;

    if (i === liveIndex) return openCard(q, year, true);
    if (acceptPreviousQuarter && i === liveIndex - 1) return openCard(q, year, false);
    if (i < liveIndex) {
      return { key: q.key, label, months: q.months, status: "updated", percent: null, clickable: false, live: false };
    }
    return { key: q.key, label, months: q.months, status: "not_updated", percent: null, clickable: false, live: false };
  });

  if (acceptPreviousQuarter && liveIndex === 0) {
    const lastQ4 = openCard(QUARTER_DEFS[3], year - 1, false);
    return [{ ...lastQ4, key: `q4-${year - 1}` }, ...cards];
  }
  return cards;
}

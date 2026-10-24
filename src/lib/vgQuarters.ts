import { currentYearPH, currentMonthPH, monthYearPH } from "@/lib/date";

export type QuarterCardStatus = "updated" | "incomplete" | "not_updated";

export interface QuarterCard {
  key: string;
  label: string;
  status: QuarterCardStatus;
  percent: number | null;
  clickable: boolean;
  /** The current calendar period — reports key off this, since `clickable` can also be true for the grace-period one. */
  live: boolean;
  /** Month range shown under the label, e.g. "Sep–Dec". */
  months: string;
}

export const QUARTER_STATUS_BADGE: Record<QuarterCardStatus, string> = {
  updated: "bg-green-100 text-green-700",
  incomplete: "bg-amber-100 text-amber-700",
  not_updated: "bg-gray-100 text-gray-500",
};

export const QUARTER_STATUS_LABEL: Record<QuarterCardStatus, string> = {
  updated: "Updated",
  incomplete: "Incomplete",
  not_updated: "Not Updated",
};

/** featureFlags key: when on, VG leaders can still update the period that just ended (e.g. Mid-Year during September–December). */
export const ACCEPT_PREVIOUS_QUARTER_FLAG = "vgl_accept_previous_quarter";

/** featureFlags key: when on, an update made during the previous period also counts for the live one (a Mid-Year update satisfies End of Year). */
export const CARRY_OVER_PREVIOUS_QUARTER_FLAG = "vgl_carry_over_previous_quarter";

export interface QuarterOptions {
  acceptPreviousQuarter?: boolean;
  carryOverPreviousQuarter?: boolean;
}

// Update periods (formerly Q1-Q4). The "quarter" names in this module and its callers
// are historical — each entry is one of the three yearly update periods below.
const QUARTER_DEFS = [
  { key: "start", label: "Start of Year", startMonth: 1, endMonth: 4, months: "Jan–Apr" },
  { key: "mid", label: "Mid-Year", startMonth: 5, endMonth: 8, months: "May–Aug" },
  { key: "end", label: "End of Year", startMonth: 9, endMonth: 12, months: "Sep–Dec" },
];

const LAST_QUARTER_DEF = QUARTER_DEFS[QUARTER_DEFS.length - 1];

/**
 * VG leaders are expected to confirm/update their profile once per period, three times
 * a year: Start of Year (Jan-Apr) / Mid-Year (May-Aug) / End of Year (Sep-Dec). Periods
 * open and close automatically by the current month (Asia/Manila). Each period's card status:
 * - already ended -> "updated" (the window is closed, no point re-litigating it)
 * - not yet started -> "not_updated" (grayed, nothing to do yet)
 * - the live period -> derived from whether `updatedAt` falls within it and
 *   whether the profile is 100% complete; only this one is clickable.
 *
 * With `acceptPreviousQuarter` on, the period that just ended stays open too:
 * it's clickable and its status counts any update made since it started (so a
 * September update still satisfies Mid-Year). In Jan-Apr that's last year's
 * End of Year, which gets its own card ahead of Start of Year.
 *
 * With `carryOverPreviousQuarter` on, the live period also counts updates made
 * during the previous period, so leaders who already updated for Mid-Year don't
 * have to update again for End of Year.
 */
/** The current live period. Every month falls in one of the three periods, so this is never null in practice — the null case is kept only as a defensive fallback. */
export function getLiveQuarter(): { key: string; label: string; months: string } | null {
  const year = currentYearPH();
  const month = currentMonthPH();
  const q = QUARTER_DEFS.find((q) => month >= q.startMonth && month <= q.endMonth);
  return q ? { key: q.key, label: `${q.label} ${year}`, months: q.months } : null;
}

export function getProfileUpdateQuarters(
  updatedAt: Date,
  profilePercent: number,
  { acceptPreviousQuarter = false, carryOverPreviousQuarter = false }: QuarterOptions = {},
): QuarterCard[] {
  const year = currentYearPH();
  const month = currentMonthPH();
  const updated = monthYearPH(updatedAt);
  const liveIndex = QUARTER_DEFS.findIndex((q) => month >= q.startMonth && month <= q.endMonth);
  const previousStart =
    liveIndex === 0
      ? { year: year - 1, month: LAST_QUARTER_DEF.startMonth }
      : { year, month: QUARTER_DEFS[liveIndex - 1].startMonth };

  // Open period: status comes from whether the profile was touched on or after `countFrom`
  // (normally the period's own start). For the live period that's the same as "within it",
  // since updatedAt can't be in the future.
  function openCard(
    q: (typeof QUARTER_DEFS)[number],
    qYear: number,
    live: boolean,
    countFrom = { year: qYear, month: q.startMonth },
  ): QuarterCard {
    const base = { key: q.key, label: `${q.label} ${qYear}`, months: q.months, clickable: true, live };
    const updatedSinceStart =
      updated.year > countFrom.year || (updated.year === countFrom.year && updated.month >= countFrom.month);

    if (updatedSinceStart && profilePercent === 100) return { ...base, status: "updated", percent: null };
    if (updatedSinceStart) return { ...base, status: "incomplete", percent: profilePercent };
    return { ...base, status: "not_updated", percent: null };
  }

  const cards = QUARTER_DEFS.map((q, i): QuarterCard => {
    const label = `${q.label} ${year}`;

    if (i === liveIndex) return openCard(q, year, true, carryOverPreviousQuarter ? previousStart : undefined);
    if (acceptPreviousQuarter && i === liveIndex - 1) return openCard(q, year, false);
    if (i < liveIndex) {
      return { key: q.key, label, months: q.months, status: "updated", percent: null, clickable: false, live: false };
    }
    return { key: q.key, label, months: q.months, status: "not_updated", percent: null, clickable: false, live: false };
  });

  if (acceptPreviousQuarter && liveIndex === 0) {
    const lastYearEnd = openCard(LAST_QUARTER_DEF, year - 1, false);
    return [{ ...lastYearEnd, key: `${LAST_QUARTER_DEF.key}-${year - 1}` }, ...cards];
  }
  return cards;
}

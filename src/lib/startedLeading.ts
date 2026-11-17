import { currentYearPH } from "@/lib/date";

export type StartedLeadingVg = "before_this_year" | "this_year";

/*
 * "When did you start leading a Victory Group?" is answered relative to the year it was given
 * (`startedLeadingVgYear`). Answers carry forward instead of being asked again each year: a
 * "this year" given in 2026 means started in 2026, which from 2027 on reads as "before this year".
 */

/** The answer as of `year` (default: now) — what the profile form shows as selected. */
export function startedLeadingAsOf(
  value: string | null,
  answerYear: number | null,
  year = currentYearPH()
): StartedLeadingVg | null {
  if (value !== "this_year" && value !== "before_this_year") return null;
  if (value === "this_year" && answerYear != null && answerYear < year) return "before_this_year";
  return value;
}

/** e.g. "Started leading in 2026" or "Before 2026". */
export function startedLeadingLabel(value: string | null, answerYear: number | null): string | null {
  if (value !== "this_year" && value !== "before_this_year") return null;
  if (answerYear == null) return value === "this_year" ? "This year" : "Before this year";
  return value === "this_year" ? `Started leading in ${answerYear}` : `Before ${answerYear}`;
}

/** The year they started leading, when known (only a "this year" answer pins it down). */
export function startedLeadingYear(value: string | null, answerYear: number | null): number | null {
  return value === "this_year" ? answerYear : null;
}

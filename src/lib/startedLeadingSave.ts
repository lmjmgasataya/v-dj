import { sql } from "drizzle-orm";
import { victoryGroupLeaders } from "@/db/schema";
import { currentYearPH } from "@/lib/date";

/**
 * The columns to set when a profile form submits "When did you start leading?". "This year" is
 * saved as this year's answer. "Before this year" keeps an answer on record from an earlier year —
 * it already says that, more precisely (e.g. "started in 2026") — and is otherwise saved as this
 * year's. Done in SQL so it doesn't need the current row read first.
 */
export function startedLeadingVgSet(submitted: FormDataEntryValue | null) {
  const year = currentYearPH();
  if (submitted === "this_year") return { startedLeadingVg: "this_year" as const, startedLeadingVgYear: year };
  if (submitted !== "before_this_year") return { startedLeadingVg: null, startedLeadingVgYear: null };

  const { startedLeadingVg: value, startedLeadingVgYear: answerYear } = victoryGroupLeaders;
  const keepEarlier = sql`(${value} is not null and ${answerYear} < ${year})`;
  return {
    startedLeadingVg: sql`case when ${keepEarlier} then ${value} else 'before_this_year'::started_leading_vg end`,
    startedLeadingVgYear: sql`case when ${keepEarlier} then ${answerYear} else ${year}::integer end`,
  };
}

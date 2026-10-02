import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { ACCEPT_PREVIOUS_QUARTER_FLAG, CARRY_OVER_PREVIOUS_QUARTER_FLAG, type QuarterOptions } from "@/lib/vgQuarters";

/** Reads the VG Leader Portal quarter settings (both default off when the flag row doesn't exist). */
export async function getQuarterOptions(): Promise<Required<QuarterOptions>> {
  const rows = await db
    .select({ key: featureFlags.key, enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(inArray(featureFlags.key, [ACCEPT_PREVIOUS_QUARTER_FLAG, CARRY_OVER_PREVIOUS_QUARTER_FLAG]));
  const enabled = (key: string) => rows.find((r) => r.key === key)?.enabled ?? false;
  return {
    acceptPreviousQuarter: enabled(ACCEPT_PREVIOUS_QUARTER_FLAG),
    carryOverPreviousQuarter: enabled(CARRY_OVER_PREVIOUS_QUARTER_FLAG),
  };
}

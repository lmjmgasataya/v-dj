import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import type { VgLeaderOption } from "./vgLeaderSearch";

/**
 * Every non-deleted VG leader — a few hundred rows, so a form loads them once and the
 * autocompletes filter client-side (searchVgLeaders) instead of querying on each keystroke.
 */
export async function getVgLeaderOptions(): Promise<VgLeaderOption[]> {
  return db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      nickname: victoryGroupLeaders.nickname,
      mobileNumber: victoryGroupLeaders.mobileNumber,
      facebookMessengerName: victoryGroupLeaders.facebookMessengerName,
    })
    .from(victoryGroupLeaders)
    .where(isNull(victoryGroupLeaders.deletedAt))
    .orderBy(asc(victoryGroupLeaders.lastName), asc(victoryGroupLeaders.firstName));
}

import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { computeProfileCompleted, computeProfileProgress } from "@/lib/profileCompleteness";
import { getProfileUpdateQuarters, type QuarterCardStatus } from "@/lib/vgQuarters";
import { getQuarterOptions } from "@/lib/vgQuarterFlags";

/**
 * Marks the leader's record as updated now. Quarterly update status keys off `updatedAt`, so
 * a VG leader changing only their Victory Groups / interns in the portal still counts as
 * having updated that quarter.
 */
export async function touchVgLeaderUpdatedAt(vgLeaderId: number): Promise<void> {
  await db.update(victoryGroupLeaders).set({ updatedAt: new Date() }).where(eq(victoryGroupLeaders.id, vgLeaderId));
}

export async function recomputeProfileCompleted(vgLeaderId: number): Promise<void> {
  const [[leader], activeGroups] = await Promise.all([
    db.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, vgLeaderId)).limit(1),
    db
      .select({ id: victoryGroups.id })
      .from(victoryGroups)
      .where(
        and(eq(victoryGroups.vgLeaderId, vgLeaderId), eq(victoryGroups.isActive, true), isNull(victoryGroups.deletedAt))
      ),
  ]);
  if (!leader) return;

  const profileCompleted = computeProfileCompleted(leader, activeGroups.length > 0);
  if (profileCompleted !== leader.profileCompleted) {
    await db.update(victoryGroupLeaders).set({ profileCompleted }).where(eq(victoryGroupLeaders.id, vgLeaderId));
  }
}

/**
 * The leader's status for the live update period, as the profile page shows it: "updated" means
 * they saved their profile during this period (or the carried-over one) and it's 100% complete.
 */
export async function getLiveUpdateStatus(vgLeaderId: number): Promise<QuarterCardStatus> {
  const [[leader], activeGroups, quarterOptions] = await Promise.all([
    db.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, vgLeaderId)).limit(1),
    db
      .select({ id: victoryGroups.id })
      .from(victoryGroups)
      .where(
        and(eq(victoryGroups.vgLeaderId, vgLeaderId), eq(victoryGroups.isActive, true), isNull(victoryGroups.deletedAt))
      ),
    getQuarterOptions(),
  ]);
  if (!leader) return "not_updated";

  const { percent } = computeProfileProgress(leader, activeGroups.length > 0);
  const live = getProfileUpdateQuarters(leader.updatedAt, percent, quarterOptions).find((q) => q.live);
  return live?.status ?? (percent === 100 ? "updated" : "incomplete");
}

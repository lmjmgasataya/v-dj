import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { computeProfileCompleted } from "@/lib/profileCompleteness";

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

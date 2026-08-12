import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { computeProfileCompleted } from "@/lib/profileCompleteness";

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

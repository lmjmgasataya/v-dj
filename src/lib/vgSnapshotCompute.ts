import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import {
  SERVICE_BUCKETS,
  serviceToBucket,
  emptyBucketCounts,
  type VgServiceBucket,
  type VgBucketCounts,
  type VgSnapshotData,
} from "@/lib/vgSnapshot";

export function isInternSet(intern: string | null): boolean {
  return !!intern && intern.trim().toLowerCase() !== "none";
}

/**
 * Computes the derivable counts (VG Leaders / Victory Groups / Interns / Leadership Group Leaders,
 * by service bucket and gender) from live data. A VG leader is a Leadership Group Leader when at
 * least one other VG leader has named them (via `ownVgLeaderId`) as their own VG leader.
 */
export async function computeVgSnapshotCounts(): Promise<
  Pick<VgSnapshotData, "byService" | "totals" | "vglByGender" | "genderTotals">
> {
  const [leaders, groups] = await Promise.all([
    db
      .select({
        id: victoryGroupLeaders.id,
        gender: victoryGroupLeaders.gender,
        serviceAttending: victoryGroupLeaders.serviceAttending,
        ownVgLeaderId: victoryGroupLeaders.ownVgLeaderId,
      })
      .from(victoryGroupLeaders)
      .where(isNull(victoryGroupLeaders.deletedAt)),
    db
      .select({ vgLeaderId: victoryGroups.vgLeaderId, intern: victoryGroups.intern })
      .from(victoryGroups)
      .where(and(eq(victoryGroups.isActive, true), isNull(victoryGroups.deletedAt))),
  ]);

  const leaderById = new Map(leaders.map((l) => [l.id, l]));
  const activeLeaderIds = new Set<number>();

  const byService: Record<VgServiceBucket, VgBucketCounts> = {
    "9AM & 11AM": emptyBucketCounts(),
    "2PM & 4PM": emptyBucketCounts(),
    "6PM": emptyBucketCounts(),
    "10AM & 1PM": emptyBucketCounts(),
  };

  for (const g of groups) {
    const leader = leaderById.get(g.vgLeaderId);
    const bucket = serviceToBucket(leader?.serviceAttending ?? null);
    if (!bucket) continue;

    byService[bucket].victoryGroups += 1;
    if (isInternSet(g.intern)) byService[bucket].interns += 1;
    activeLeaderIds.add(g.vgLeaderId);
  }

  const vglByGender: Record<VgServiceBucket, { male: number; female: number }> = {
    "9AM & 11AM": { male: 0, female: 0 },
    "2PM & 4PM": { male: 0, female: 0 },
    "6PM": { male: 0, female: 0 },
    "10AM & 1PM": { male: 0, female: 0 },
  };

  for (const leaderId of activeLeaderIds) {
    const leader = leaderById.get(leaderId);
    const bucket = serviceToBucket(leader?.serviceAttending ?? null);
    if (!bucket) continue;
    byService[bucket].vgLeaders += 1;
    if (leader?.gender === "Male") vglByGender[bucket].male += 1;
    if (leader?.gender === "Female") vglByGender[bucket].female += 1;
  }

  const leadershipGroupLeaderIds = new Set(
    leaders.filter((l) => l.ownVgLeaderId != null).map((l) => l.ownVgLeaderId as number)
  );
  for (const leaderId of leadershipGroupLeaderIds) {
    const leader = leaderById.get(leaderId);
    if (!leader) continue;
    const bucket = serviceToBucket(leader.serviceAttending ?? null);
    if (!bucket) continue;
    byService[bucket].leadershipGroups += 1;
  }

  const totals = emptyBucketCounts();
  const genderTotals = { male: 0, female: 0 };
  for (const bucket of SERVICE_BUCKETS) {
    totals.vgLeaders += byService[bucket].vgLeaders;
    totals.victoryGroups += byService[bucket].victoryGroups;
    totals.interns += byService[bucket].interns;
    totals.leadershipGroups += byService[bucket].leadershipGroups;
    genderTotals.male += vglByGender[bucket].male;
    genderTotals.female += vglByGender[bucket].female;
  }

  return { byService, totals, vglByGender, genderTotals };
}

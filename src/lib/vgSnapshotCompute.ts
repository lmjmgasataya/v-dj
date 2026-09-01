import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { isQuarterlyActive } from "@/lib/vgLeaderStatus";
import {
  SERVICE_BUCKETS,
  serviceToBucket,
  emptyBucketCounts,
  emptyBucketDetail,
  type VgServiceBucket,
  type VgBucketCounts,
  type VgBucketDetail,
  type VgSnapshotData,
} from "@/lib/vgSnapshot";

export function isInternSet(intern: string | null): boolean {
  return !!intern && intern.trim().toLowerCase() !== "none";
}

/**
 * Computes the derivable counts (VG Leaders / Victory Groups / Interns / Leadership Group Leaders,
 * by service bucket and gender) from live data, plus the underlying leader/group detail behind
 * each count (for report drill-down). A VG leader is a Leadership Group Leader when at least one
 * other VG leader has named them (via `ownVgLeaderId`) as their own VG leader. A VG leader counts
 * as active for this report when they've updated their profile within the last quarter
 * (`isQuarterlyActive`) — independent of whether they currently own any Victory Group.
 */
export async function computeVgSnapshotCounts(): Promise<
  Pick<VgSnapshotData, "byService" | "totals" | "vglByGender" | "genderTotals" | "detailsByService" | "totalsDetail">
> {
  const [leaders, groups] = await Promise.all([
    db
      .select({
        id: victoryGroupLeaders.id,
        lastName: victoryGroupLeaders.lastName,
        firstName: victoryGroupLeaders.firstName,
        gender: victoryGroupLeaders.gender,
        serviceAttending: victoryGroupLeaders.serviceAttending,
        ownVgLeaderId: victoryGroupLeaders.ownVgLeaderId,
        updatedAt: victoryGroupLeaders.updatedAt,
      })
      .from(victoryGroupLeaders)
      .where(isNull(victoryGroupLeaders.deletedAt)),
    db
      .select({
        id: victoryGroups.id,
        vgLeaderId: victoryGroups.vgLeaderId,
        intern: victoryGroups.intern,
        place: victoryGroups.place,
        day: victoryGroups.day,
        time: victoryGroups.time,
      })
      .from(victoryGroups)
      .where(and(eq(victoryGroups.isActive, true), isNull(victoryGroups.deletedAt))),
  ]);

  const leaderById = new Map(leaders.map((l) => [l.id, l]));
  const leaderName = (id: number) => {
    const l = leaderById.get(id);
    return l ? `${l.lastName}, ${l.firstName}` : `#${id}`;
  };

  const byService: Record<VgServiceBucket, VgBucketCounts> = {
    "9AM & 11AM": emptyBucketCounts(),
    "2PM & 4PM": emptyBucketCounts(),
    "6PM": emptyBucketCounts(),
    "10AM & 1PM": emptyBucketCounts(),
  };
  const detailsByService: Record<VgServiceBucket, VgBucketDetail> = {
    "9AM & 11AM": emptyBucketDetail(),
    "2PM & 4PM": emptyBucketDetail(),
    "6PM": emptyBucketDetail(),
    "10AM & 1PM": emptyBucketDetail(),
  };

  // Victory Groups / Interns — unchanged rule: keyed off the group's own `isActive` flag.
  for (const g of groups) {
    const leader = leaderById.get(g.vgLeaderId);
    const bucket = serviceToBucket(leader?.serviceAttending ?? null);
    if (!bucket) continue;

    byService[bucket].victoryGroups += 1;
    detailsByService[bucket].victoryGroups.push({
      id: g.id,
      label: `${leaderName(g.vgLeaderId)} — ${g.day} ${g.time} @ ${g.place}`,
    });
    if (isInternSet(g.intern)) {
      byService[bucket].interns += 1;
      detailsByService[bucket].interns.push(g.intern!.trim());
    }
  }

  // VG Leaders / gender — active means "updated within the last quarter", regardless of
  // whether they currently own any Victory Group.
  const vglByGender: Record<VgServiceBucket, { male: number; female: number }> = {
    "9AM & 11AM": { male: 0, female: 0 },
    "2PM & 4PM": { male: 0, female: 0 },
    "6PM": { male: 0, female: 0 },
    "10AM & 1PM": { male: 0, female: 0 },
  };

  for (const leader of leaders) {
    if (!isQuarterlyActive(leader.updatedAt)) continue;
    const bucket = serviceToBucket(leader.serviceAttending);
    if (!bucket) continue;

    byService[bucket].vgLeaders += 1;
    detailsByService[bucket].vgLeaders.push({ id: leader.id, name: leaderName(leader.id) });
    if (leader.gender === "Male") vglByGender[bucket].male += 1;
    if (leader.gender === "Female") vglByGender[bucket].female += 1;
  }

  // Leadership Group Leaders — unchanged rule.
  const leadershipGroupLeaderIds = new Set(
    leaders.filter((l) => l.ownVgLeaderId != null).map((l) => l.ownVgLeaderId as number)
  );
  for (const leaderId of leadershipGroupLeaderIds) {
    const leader = leaderById.get(leaderId);
    if (!leader) continue;
    const bucket = serviceToBucket(leader.serviceAttending ?? null);
    if (!bucket) continue;
    byService[bucket].leadershipGroups += 1;
    detailsByService[bucket].leadershipGroups.push({ id: leaderId, name: leaderName(leaderId) });
  }

  const totals = emptyBucketCounts();
  const genderTotals = { male: 0, female: 0 };
  const totalsDetail = emptyBucketDetail();
  for (const bucket of SERVICE_BUCKETS) {
    totals.vgLeaders += byService[bucket].vgLeaders;
    totals.victoryGroups += byService[bucket].victoryGroups;
    totals.interns += byService[bucket].interns;
    totals.leadershipGroups += byService[bucket].leadershipGroups;
    genderTotals.male += vglByGender[bucket].male;
    genderTotals.female += vglByGender[bucket].female;

    totalsDetail.vgLeaders.push(...detailsByService[bucket].vgLeaders);
    totalsDetail.victoryGroups.push(...detailsByService[bucket].victoryGroups);
    totalsDetail.interns.push(...detailsByService[bucket].interns);
    totalsDetail.leadershipGroups.push(...detailsByService[bucket].leadershipGroups);
  }

  return { byService, totals, vglByGender, genderTotals, detailsByService, totalsDetail };
}

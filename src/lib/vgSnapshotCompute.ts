import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, interns } from "@/db/schema";
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
 * each count (for report drill-down). A VG leader is a Leadership Group Leader when they've
 * self-declared it (`isLeadershipGroupLeader`) — bucketed by their own service, not their members'.
 * A VG leader counts as active for this report when they're currently leading a Victory Group
 * (`isActive`) and have updated their profile within the last quarter (`isQuarterlyActive`).
 */
export async function computeVgSnapshotCounts(): Promise<
  Pick<VgSnapshotData, "byService" | "totals" | "vglByGender" | "genderTotals" | "detailsByService" | "totalsDetail">
> {
  const [leaders, groups, internRows] = await Promise.all([
    db
      .select({
        id: victoryGroupLeaders.id,
        lastName: victoryGroupLeaders.lastName,
        firstName: victoryGroupLeaders.firstName,
        gender: victoryGroupLeaders.gender,
        serviceAttending: victoryGroupLeaders.serviceAttending,
        isLeadershipGroupLeader: victoryGroupLeaders.isLeadershipGroupLeader,
        isActive: victoryGroupLeaders.isActive,
        updatedAt: victoryGroupLeaders.updatedAt,
      })
      .from(victoryGroupLeaders)
      .where(isNull(victoryGroupLeaders.deletedAt)),
    db
      .select({
        id: victoryGroups.id,
        vgLeaderId: victoryGroups.vgLeaderId,
        place: victoryGroups.place,
        day: victoryGroups.day,
        time: victoryGroups.time,
      })
      .from(victoryGroups)
      .where(and(eq(victoryGroups.isActive, true), isNull(victoryGroups.deletedAt), eq(victoryGroups.type, "victory_group"))),
    db
      .select({ victoryGroupId: interns.victoryGroupId, lastName: interns.lastName, firstName: interns.firstName })
      .from(interns)
      .where(isNull(interns.deletedAt)),
  ]);

  const leaderById = new Map(leaders.map((l) => [l.id, l]));
  const leaderName = (id: number) => {
    const l = leaderById.get(id);
    return l ? `${l.lastName}, ${l.firstName}` : `#${id}`;
  };

  const internsByGroup = new Map<number, { lastName: string; firstName: string }[]>();
  for (const i of internRows) {
    const list = internsByGroup.get(i.victoryGroupId) ?? [];
    list.push({ lastName: i.lastName, firstName: i.firstName });
    internsByGroup.set(i.victoryGroupId, list);
  }

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

    const groupInterns = internsByGroup.get(g.id) ?? [];
    for (const i of groupInterns) {
      byService[bucket].interns += 1;
      detailsByService[bucket].interns.push(`${i.lastName}, ${i.firstName}`);
    }
  }

  // VG Leaders / gender — active means currently leading a Victory Group and having
  // updated their profile within the last quarter.
  const vglByGender: Record<VgServiceBucket, { male: number; female: number }> = {
    "9AM & 11AM": { male: 0, female: 0 },
    "2PM & 4PM": { male: 0, female: 0 },
    "6PM": { male: 0, female: 0 },
    "10AM & 1PM": { male: 0, female: 0 },
  };

  for (const leader of leaders) {
    if (!leader.isActive) continue;
    if (!isQuarterlyActive(leader.updatedAt)) continue;
    const bucket = serviceToBucket(leader.serviceAttending);
    if (!bucket) continue;

    byService[bucket].vgLeaders += 1;
    detailsByService[bucket].vgLeaders.push({ id: leader.id, name: leaderName(leader.id) });
    if (leader.gender === "Male") vglByGender[bucket].male += 1;
    if (leader.gender === "Female") vglByGender[bucket].female += 1;
  }

  // Leadership Group Leaders — self-declared, bucketed by the LGL's own service.
  for (const leader of leaders) {
    if (!leader.isLeadershipGroupLeader) continue;
    const bucket = serviceToBucket(leader.serviceAttending);
    if (!bucket) continue;
    byService[bucket].leadershipGroups += 1;
    detailsByService[bucket].leadershipGroups.push({ id: leader.id, name: leaderName(leader.id) });
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

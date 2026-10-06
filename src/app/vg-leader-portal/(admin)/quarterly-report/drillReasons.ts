import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, interns } from "@/db/schema";
import {
  SERVICE_BUCKETS,
  serviceToBucket,
  snapshotItems,
  internKey,
  type MatchItem,
  type VgServiceBucket,
} from "@/lib/vgSnapshot";
import { isQuarterlyActive } from "@/lib/vgLeaderStatus";
import { computeProfileProgress } from "@/lib/profileCompleteness";
import { normalizeName } from "@/lib/vgLeaderMatch";
import { getProfileNotCompletedRows } from "@/lib/vglProfileNotCompleted";
import { REMARK } from "@/lib/vglRemarks";
import { DRILL_METRICS, drillCellKey, type DrillLists, type Metric, type Side } from "./drillData";

/** A compared side plus what the reasons need to know about it. */
export type ReasonSide = Side & { isLive: boolean; asOfDate: Date; source?: string };

function fmt(d: Date) {
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
}

function leaderIdOf(item: MatchItem): number | null {
  const m = /^id:(\d+)$/.exec(item.match ?? item.idMatch);
  return m ? Number(m[1]) : null;
}

/**
 * Fills in `reason` on every added/removed item. For leaders (and Victory Groups, through their
 * leader) it's the leader's remarks from the VG Leaders Report's "Profile Not Yet Completed"
 * list, so both reports explain people the same way. When none applies, or for interns, it
 * falls back to why the item is counted on one side and not the other, judged against the rules
 * in computeVgSnapshotCounts: service moves come from the two snapshots themselves, everything
 * else from the records as they are today (marked "Today:" when the latest side isn't Live Now).
 */
export async function addDrillReasons(lists: Record<string, DrillLists>, latest: ReasonSide, previous: ReasonSide | null) {
  if (!previous) return;

  const [leaderRows, groupRows, internRows, notCompletedRows] = await Promise.all([
    db
      .select({
        id: victoryGroupLeaders.id,
        serviceAttending: victoryGroupLeaders.serviceAttending,
        isActive: victoryGroupLeaders.isActive,
        isLeadershipGroupLeader: victoryGroupLeaders.isLeadershipGroupLeader,
        updatedAt: victoryGroupLeaders.updatedAt,
        createdAt: victoryGroupLeaders.createdAt,
        deletedAt: victoryGroupLeaders.deletedAt,
        nickname: victoryGroupLeaders.nickname,
        mobileNumber: victoryGroupLeaders.mobileNumber,
        age: victoryGroupLeaders.age,
        gender: victoryGroupLeaders.gender,
        lifestage: victoryGroupLeaders.lifestage,
        facebookMessengerName: victoryGroupLeaders.facebookMessengerName,
        ownVgLeaderName: victoryGroupLeaders.ownVgLeaderName,
        startedLeadingVg: victoryGroupLeaders.startedLeadingVg,
      })
      .from(victoryGroupLeaders),
    db
      .select({
        id: victoryGroups.id,
        vgLeaderId: victoryGroups.vgLeaderId,
        day: victoryGroups.day,
        type: victoryGroups.type,
        isActive: victoryGroups.isActive,
        createdAt: victoryGroups.createdAt,
        deletedAt: victoryGroups.deletedAt,
      })
      .from(victoryGroups),
    db
      .select({
        lastName: interns.lastName,
        firstName: interns.firstName,
        victoryGroupId: interns.victoryGroupId,
        createdAt: interns.createdAt,
        deletedAt: interns.deletedAt,
      })
      .from(interns),
    getProfileNotCompletedRows(),
  ]);

  // Remarks per leader record, and by name for quarterly-update respondents with no record.
  const remarksById = new Map<number, string[]>();
  const remarksByName = new Map<string, string[]>();
  for (const r of notCompletedRows) {
    if (r.leaderId != null) remarksById.set(r.leaderId, r.remarks);
    else remarksByName.set(normalizeName(r.name), r.remarks);
  }
  /**
   * Remarks for one leader as listed on `side`. Form snapshots give respondents with no leader
   * record a negative id — those are "found in the database but missing" by definition.
   */
  function leaderRemarks(id: number | null, name: string, side: ReasonSide): string[] | null {
    if (id != null && id > 0) return remarksById.get(id) ?? null;
    return remarksByName.get(normalizeName(name)) ?? [REMARK.manualMissing(side.label)];
  }
  const leaders = new Map(leaderRows.map((l) => [l.id, l]));
  const groups = new Map(groupRows.map((g) => [g.id, g]));
  const groupsOfLeader = new Map<number, typeof groupRows>();
  const groupsByLeaderAnyType = new Map<number, typeof groupRows>();
  for (const g of groupRows) {
    groupsByLeaderAnyType.set(g.vgLeaderId, [...(groupsByLeaderAnyType.get(g.vgLeaderId) ?? []), g]);
    if (g.type !== "victory_group") continue;
    groupsOfLeader.set(g.vgLeaderId, [...(groupsOfLeader.get(g.vgLeaderId) ?? []), g]);
  }
  const internsByKey = new Map<string, typeof internRows>();
  for (const i of internRows) {
    const k = internKey(`${i.lastName}, ${i.firstName}`);
    internsByKey.set(k, [...(internsByKey.get(k) ?? []), i]);
  }

  const today = latest.isLive ? "" : "Today: ";
  const notIn = (side: ReasonSide) =>
    side.source === "form" ? `Not in the ${side.label} form responses` : `Not counted in ${side.label}`;
  const newSince = (createdAt: Date) => createdAt > previous.asOfDate;

  // Which service bucket each item sits in on a side, to explain moves in per-service cells.
  function bucketsOf(side: ReasonSide, metric: Metric) {
    const out = new Map<string, VgServiceBucket>();
    for (const b of SERVICE_BUCKETS) {
      for (const i of snapshotItems(side.data, b, metric) ?? []) out.set(i.match ?? i.idMatch, b);
    }
    return out;
  }

  function leaderRemoved(item: MatchItem, metric: Metric): string {
    const id = leaderIdOf(item);
    const l = id != null ? leaders.get(id) : undefined;
    if (!l) return "Record no longer exists (permanently deleted)";
    if (l.deletedAt) return `Record deleted on ${fmt(l.deletedAt)} (or merged into another record)`;
    if (!serviceToBucket(l.serviceAttending)) return `${today}No service set`;
    if (metric === "leadershipGroups") {
      if (!l.isLeadershipGroupLeader) return `${today}No longer marked as a Leadership Group Leader`;
    } else {
      if (!l.isActive) return `${today}Marked as not active`;
      if (!isQuarterlyActive(l.updatedAt)) return `${today}Profile not updated in the last 90 days (last update ${fmt(l.updatedAt)})`;
      const hasActiveGroup = (groupsByLeaderAnyType.get(l.id) ?? []).some((g) => !g.deletedAt && g.isActive);
      const { percent, missing } = computeProfileProgress(l, hasActiveGroup);
      if (percent !== 100) return `${today}Profile incomplete (missing: ${missing.join(", ")})`;
    }
    return latest.isLive ? "Reason unknown" : `Counted again today (changed after ${latest.label})`;
  }

  function leaderAdded(item: MatchItem, metric: Metric): string {
    const id = leaderIdOf(item);
    const l = id != null ? leaders.get(id) : undefined;
    if (l && newSince(l.createdAt)) return `New record (added ${fmt(l.createdAt)})`;
    if (previous!.source === "form") return notIn(previous!);
    if (l && metric === "vgLeaders" && l.updatedAt > previous!.asOfDate) return `Updated profile on ${fmt(l.updatedAt)}`;
    if (metric === "leadershipGroups") return `Marked as a Leadership Group Leader after ${previous!.label}`;
    return notIn(previous!);
  }

  // Groups match by "leaderId|day" (see victoryGroupKey), older snapshots by "id:N".
  function groupOf(item: MatchItem) {
    const byId = /^id:(\d+)$/.exec(item.idMatch);
    const key = item.match && !item.match.startsWith("id:") ? item.match.split("|") : null;
    const leaderId = key ? Number(key[0]) : byId ? groups.get(Number(byId[1]))?.vgLeaderId ?? null : null;
    const sameDay = key ? (groupsOfLeader.get(leaderId!) ?? []).filter((g) => g.day.toLowerCase() === key[1]) : [];
    const group = sameDay.find((g) => !g.deletedAt && g.isActive) ?? sameDay[0] ?? (byId ? groups.get(Number(byId[1])) : undefined);
    return { leaderId, group };
  }

  function groupRemoved(item: MatchItem): string {
    const { leaderId, group } = groupOf(item);
    const leader = leaderId != null ? leaders.get(leaderId) : undefined;
    if (!leader || leader.deletedAt) return "Leader's record was deleted (or merged)";
    if (!group) {
      const others = (groupsOfLeader.get(leaderId!) ?? []).filter((g) => !g.deletedAt && g.isActive);
      return others.length > 0
        ? `${today}Schedule changed (now ${others.map((g) => g.day).join(", ")})`
        : `${today}Group deleted`;
    }
    if (group.deletedAt) return `Group deleted on ${fmt(group.deletedAt)}`;
    if (!group.isActive) return `${today}Group marked inactive`;
    if (!serviceToBucket(leader.serviceAttending)) return `${today}Leader has no service set`;
    return latest.isLive ? "Reason unknown" : `Counted again today (changed after ${latest.label})`;
  }

  function groupAdded(item: MatchItem): string {
    const { group } = groupOf(item);
    if (group && newSince(group.createdAt)) return `New group (created ${fmt(group.createdAt)})`;
    return notIn(previous!);
  }

  function internRemoved(item: MatchItem): string {
    const found = internsByKey.get(item.match ?? item.idMatch) ?? [];
    if (found.length === 0) {
      // Form snapshots list free-text names that may never have had an intern record.
      return previous!.source === "form"
        ? `Listed in the ${previous!.label} form, but no matching intern record (never added, or name spelled differently)`
        : "Not found in intern records (removed, or name spelled differently)";
    }
    const current = found.find((i) => !i.deletedAt);
    if (!current) return `Intern removed on ${fmt(found[0].deletedAt!)}`;
    const group = groups.get(current.victoryGroupId);
    if (!group || group.deletedAt) return `${today}Their Victory Group was deleted`;
    if (!group.isActive) return `${today}Their Victory Group is inactive`;
    return latest.isLive ? "Reason unknown" : `Counted again today (changed after ${latest.label})`;
  }

  function internAdded(item: MatchItem): string {
    const current = (internsByKey.get(item.match ?? item.idMatch) ?? []).find((i) => !i.deletedAt);
    if (current && newSince(current.createdAt)) return `New intern (added ${fmt(current.createdAt)})`;
    return previous!.source === "form" ? `${notIn(previous!)} (or name spelled differently)` : notIn(previous!);
  }

  const leaderOfGroupLabel = (label: string) => label.split(" — ")[0];
  const remarksFor = (item: MatchItem, metric: Metric, side: ReasonSide) => {
    if (metric === "interns") return null;
    if (metric === "victoryGroups") return leaderRemarks(groupOf(item).leaderId, leaderOfGroupLabel(item.label), side);
    return leaderRemarks(leaderIdOf(item), item.label, side);
  };

  for (const metric of DRILL_METRICS) {
    const latestBuckets = bucketsOf(latest, metric);
    const prevBuckets = bucketsOf(previous, metric);
    for (const bucket of [null, ...SERVICE_BUCKETS]) {
      const cell = lists[drillCellKey(bucket, metric)];
      if (!cell) continue;
      for (const item of cell.removed ?? []) {
        const movedTo = bucket ? latestBuckets.get(item.match ?? item.idMatch) : undefined;
        item.remarks = remarksFor(item, metric, previous) ?? undefined;
        if (item.remarks) continue;
        item.reason =
          (movedTo && movedTo !== bucket
            ? `Moved to ${movedTo}`
            : metric === "victoryGroups"
              ? groupRemoved(item)
              : metric === "interns"
                ? internRemoved(item)
                : leaderRemoved(item, metric));
      }
      for (const item of cell.added ?? []) {
        const movedFrom = bucket ? prevBuckets.get(item.match ?? item.idMatch) : undefined;
        item.remarks = remarksFor(item, metric, latest) ?? undefined;
        if (item.remarks) continue;
        item.reason =
          (movedFrom && movedFrom !== bucket
            ? `Moved from ${movedFrom}`
            : metric === "victoryGroups"
              ? groupAdded(item)
              : metric === "interns"
                ? internAdded(item)
                : leaderAdded(item, metric));
      }
    }
  }
}

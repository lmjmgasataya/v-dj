import { db } from "@/db";
import {
  victoryGroupLeaders,
  victoryGroups,
  users,
  leadershipGroupMembers,
  participants,
  manualQuarterResponses,
} from "@/db/schema";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { SERVICE_OPTIONS } from "@/components/form";
import { computeProfileProgress } from "@/lib/profileCompleteness";
import { getProfileUpdateQuarters } from "@/lib/vgQuarters";
import { createLeaderMatcher } from "@/lib/vgLeaderMatch";
import { formatPersonName } from "@/lib/text";
import { REMARK, REMARK_KIND_ORDER, remarkKind } from "@/lib/vglRemarks";

const displayName = (lastName: string, firstName: string) =>
  `${formatPersonName(lastName)}, ${formatPersonName(firstName)}`;

export const NOT_SET_SERVICE = "Not Set";

export { REMARK } from "@/lib/vglRemarks";

export interface ProfileNotCompletedRow {
  key: string;
  /** null for a manual-database respondent with no VG leader record. */
  leaderId: number | null;
  name: string;
  service: string;
  serviceRank: number;
  remarks: string[];
}

const SERVICE_ORDER = [...SERVICE_OPTIONS, NOT_SET_SERVICE];
const serviceRank = (s: string) => {
  const i = SERVICE_ORDER.indexOf(s);
  return i === -1 ? SERVICE_ORDER.length : i;
};

const lglLeaders = alias(victoryGroupLeaders, "lgl_leaders");

/**
 * VG leaders the Discipleship team should follow up on to finish their profile, one row
 * per person with every reason that applies (in the REMARK order above):
 * - named as a member by a Leadership Group Leader who completed the update for the
 *   previous or live quarter (e.g. Q3–Q4), regardless of the carry-over setting
 * - named as their VG leader by a Discipleship Journey participant
 * - has a claimed portal account (a PIN reset still counts) but the profile is incomplete
 * - answered a quarterly update collected outside the portal (manual_quarter_responses)
 *   and either their profile is incomplete or there's no leader record for them at all
 */
export async function getProfileNotCompletedRows(): Promise<ProfileNotCompletedRow[]> {
  const [leaders, accounts, activeGroups, lglMemberRows, participantRows, manualResponses] = await Promise.all([
    db.select().from(victoryGroupLeaders).where(isNull(victoryGroupLeaders.deletedAt)),
    db
      .select({ vgLeaderId: users.vgLeaderId })
      .from(users)
      .where(eq(users.role, "vg_leader")),
    db
      .select({ vgLeaderId: victoryGroups.vgLeaderId })
      .from(victoryGroups)
      .where(and(isNull(victoryGroups.deletedAt), eq(victoryGroups.isActive, true))),
    db
      .select({ memberId: leadershipGroupMembers.memberVgLeaderId, leaderId: leadershipGroupMembers.leaderId })
      .from(leadershipGroupMembers)
      .innerJoin(victoryGroupLeaders, eq(leadershipGroupMembers.memberVgLeaderId, victoryGroupLeaders.id))
      .innerJoin(lglLeaders, eq(leadershipGroupMembers.leaderId, lglLeaders.id))
      .where(and(isNull(victoryGroupLeaders.deletedAt), isNull(lglLeaders.deletedAt))),
    db
      .selectDistinct({ vgLeaderId: participants.vgLeaderId })
      .from(participants)
      .innerJoin(victoryGroupLeaders, eq(participants.vgLeaderId, victoryGroupLeaders.id))
      .where(
        and(
          isNull(participants.deletedAt),
          isNotNull(participants.vgLeaderId),
          isNull(victoryGroupLeaders.deletedAt),
          eq(victoryGroupLeaders.registeredMode, "participant_registration"),
          eq(victoryGroupLeaders.profileCompleted, false),
        ),
      ),
    db
      .select()
      .from(manualQuarterResponses)
      .orderBy(manualQuarterResponses.quarterLabel, manualQuarterResponses.lastName, manualQuarterResponses.firstName),
  ]);

  const leaderById = new Map(leaders.map((l) => [l.id, l]));
  const activeGroupIds = new Set(activeGroups.map((g) => g.vgLeaderId));
  const accountIds = new Set(accounts.map((a) => a.vgLeaderId));

  const rows = new Map<string, ProfileNotCompletedRow>();
  function addLeader(id: number, remark: string, fallbackService?: string | null) {
    const l = leaderById.get(id);
    if (!l) return;
    const key = String(id);
    const service = l.serviceAttending || fallbackService || NOT_SET_SERVICE;
    const row = rows.get(key) ?? {
      key,
      leaderId: id,
      name: displayName(l.lastName, l.firstName),
      service,
      serviceRank: serviceRank(service),
      remarks: [],
    };
    if (!row.remarks.includes(remark)) row.remarks.push(remark);
    rows.set(key, row);
  }

  const lglUpdatedThisCycle = (leaderId: number) => {
    const lgl = leaderById.get(leaderId);
    if (!lgl) return false;
    const percent = computeProfileProgress(lgl, activeGroupIds.has(lgl.id)).percent;
    const entry = getProfileUpdateQuarters(lgl.updatedAt, percent, { carryOverPreviousQuarter: true }).find(
      (q) => q.live,
    );
    return entry?.status === "updated";
  };
  for (const r of lglMemberRows) {
    if (leaderById.get(r.memberId)?.profileCompleted === false && lglUpdatedThisCycle(r.leaderId)) {
      addLeader(r.memberId, REMARK.byLgl);
    }
  }

  for (const r of participantRows) addLeader(r.vgLeaderId!, REMARK.byParticipant);

  for (const l of leaders) {
    if (accountIds.has(l.id) && !l.profileCompleted) addLeader(l.id, REMARK.claimedIncomplete);
  }

  const matchLeader = createLeaderMatcher(leaders);
  for (const r of manualResponses) {
    const match = matchLeader(r);
    if (match) {
      if (!match.leader.profileCompleted) {
        addLeader(match.leader.id, REMARK.manualIncomplete(r.quarterLabel), r.serviceAttending);
      }
      continue;
    }
    const service = r.serviceAttending || NOT_SET_SERVICE;
    rows.set(`manual-${r.id}`, {
      key: `manual-${r.id}`,
      leaderId: null,
      name: displayName(r.lastName, r.firstName),
      service,
      serviceRank: serviceRank(service),
      remarks: [REMARK.manualMissing(r.quarterLabel)],
    });
  }

  return Array.from(rows.values()).sort((a, b) => a.serviceRank - b.serviceRank || a.name.localeCompare(b.name));
}

/** Distinct remarks in display order, with how many rows carry each. */
export function countRemarks(rows: ProfileNotCompletedRow[]): { remark: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) for (const remark of r.remarks) counts.set(remark, (counts.get(remark) ?? 0) + 1);
  const rank = (remark: string) => REMARK_KIND_ORDER.indexOf(remarkKind(remark));
  return Array.from(counts.entries())
    .map(([remark, count]) => ({ remark, count }))
    .sort((a, b) => rank(a.remark) - rank(b.remark) || a.remark.localeCompare(b.remark));
}

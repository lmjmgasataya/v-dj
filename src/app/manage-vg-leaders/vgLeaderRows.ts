import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, users, participants } from "@/db/schema";
import { and, asc, eq, isNull, inArray, or } from "drizzle-orm";
import type { VgLeaderRow } from "./VgLeadersTable";
import type { ParticipantsCellEntry } from "@/components/ParticipantsCell";

export async function getVgLeaderRows(): Promise<VgLeaderRow[]> {
  const [leaders, activeGroups, accounts] = await Promise.all([
    db
      .select()
      .from(victoryGroupLeaders)
      .where(isNull(victoryGroupLeaders.deletedAt))
      .orderBy(asc(victoryGroupLeaders.lastName)),
    db
      .select({ vgLeaderId: victoryGroups.vgLeaderId })
      .from(victoryGroups)
      .where(and(isNull(victoryGroups.deletedAt), eq(victoryGroups.isActive, true), eq(victoryGroups.type, "victory_group"))),
    db
      .select({ id: users.id, vgLeaderId: users.vgLeaderId, pinHash: users.pinHash })
      .from(users)
      .where(eq(users.role, "vg_leader")),
  ]);

  const groupCountByLeader = new Map<number, number>();
  for (const g of activeGroups) {
    groupCountByLeader.set(g.vgLeaderId, (groupCountByLeader.get(g.vgLeaderId) ?? 0) + 1);
  }
  const accountByLeaderId = new Map(
    accounts.filter((a) => a.vgLeaderId != null).map((a) => [a.vgLeaderId as number, a])
  );

  const leaderIds = leaders.map((l) => l.id);
  const affiliatedParticipants = leaderIds.length > 0
    ? await db
        .select({ id: participants.id, lastName: participants.lastName, firstName: participants.firstName, vgLeaderId: participants.vgLeaderId, disciplerId: participants.disciplerId })
        .from(participants)
        .where(and(
          isNull(participants.deletedAt),
          or(inArray(participants.vgLeaderId, leaderIds), inArray(participants.disciplerId, leaderIds))
        ))
        .orderBy(asc(participants.lastName))
    : [];

  const participantsByLeader: Record<number, ParticipantsCellEntry[]> = {};
  const leaderIdSet = new Set(leaderIds);
  for (const p of affiliatedParticipants) {
    if (p.vgLeaderId != null && leaderIdSet.has(p.vgLeaderId)) {
      (participantsByLeader[p.vgLeaderId] ??= []).push({ id: p.id, lastName: p.lastName, firstName: p.firstName, relation: "vg_leader" });
    }
    if (p.disciplerId != null && leaderIdSet.has(p.disciplerId)) {
      (participantsByLeader[p.disciplerId] ??= []).push({ id: p.id, lastName: p.lastName, firstName: p.firstName, relation: "discipler" });
    }
  }

  const mobileCounts = new Map<string, number>();
  for (const l of leaders) {
    const key = l.mobileNumber?.trim();
    if (!key) continue;
    mobileCounts.set(key, (mobileCounts.get(key) ?? 0) + 1);
  }

  const nameCounts = new Map<string, number>();
  for (const l of leaders) {
    const key = `${l.lastName.trim().toLowerCase()}|${l.firstName.trim().toLowerCase()}`;
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  return leaders.map((l) => {
    const account = accountByLeaderId.get(l.id);
    const mobileKey = l.mobileNumber?.trim();
    const nameKey = `${l.lastName.trim().toLowerCase()}|${l.firstName.trim().toLowerCase()}`;
    return {
      id: l.id,
      lastName: l.lastName,
      firstName: l.firstName,
      nickname: l.nickname,
      mobileNumber: l.mobileNumber,
      duplicateMobile: !!mobileKey && (mobileCounts.get(mobileKey) ?? 0) > 1,
      duplicateName: (nameCounts.get(nameKey) ?? 0) > 1,
      claimed: !!account?.pinHash,
      accountId: account?.id ?? null,
      profileCompleted: l.profileCompleted,
      activeGroups: groupCountByLeader.get(l.id) ?? 0,
      participants: participantsByLeader[l.id] ?? [],
    };
  });
}

"use server";

import { db } from "@/db";
import {
  victoryGroupLeaders,
  participants,
  victoryGroups,
  leadershipGroupMembers,
  eventRegistrations,
  eventCheckIns,
  users,
} from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toastRedirectBack } from "@/lib/toast";
import { areSimilarNames } from "@/lib/vgLeaderMatch";
import { recomputeProfileCompleted } from "@/lib/vgLeaderProfile";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export type VgLeaderMergeCandidate = typeof victoryGroupLeaders.$inferSelect;

export async function getVgLeaderMergeCandidates(idA: number, idB: number): Promise<VgLeaderMergeCandidate[]> {
  await requireDeveloper();
  return db
    .select()
    .from(victoryGroupLeaders)
    .where(and(isNull(victoryGroupLeaders.deletedAt), inArray(victoryGroupLeaders.id, [idA, idB])));
}

const MERGE_FIELDS = [
  "middleInitial",
  "nickname",
  "mobileNumber",
  "age",
  "gender",
  "lifestage",
  "serviceAttending",
  "facebookMessengerName",
  "discipleshipJourneyCompleted",
  "graduateOfLeadership113",
  "ownVgLeaderName",
  "ownVgLeaderId",
  "startedLeadingVg",
] as const;

function isBlank(v: unknown) {
  return v === null || v === undefined || v === "";
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// leadership_group_members: unique(leaderId, memberVgLeaderId) — repoint, but drop
// instead of update wherever that would collide with a row the target record already has,
// and drop anything that would become a self-membership after repointing.
async function repointLeadershipGroupMembers(tx: Tx, fromId: number, toId: number) {
  const asLeaderRows = await tx
    .select()
    .from(leadershipGroupMembers)
    .where(eq(leadershipGroupMembers.leaderId, fromId));
  for (const row of asLeaderRows) {
    const newMemberId = row.memberVgLeaderId === fromId ? toId : row.memberVgLeaderId;
    if (newMemberId === toId) {
      await tx.delete(leadershipGroupMembers).where(eq(leadershipGroupMembers.id, row.id));
      continue;
    }
    const [existing] = await tx
      .select({ id: leadershipGroupMembers.id })
      .from(leadershipGroupMembers)
      .where(and(eq(leadershipGroupMembers.leaderId, toId), eq(leadershipGroupMembers.memberVgLeaderId, newMemberId)))
      .limit(1);
    if (existing) {
      await tx.delete(leadershipGroupMembers).where(eq(leadershipGroupMembers.id, row.id));
    } else {
      await tx.update(leadershipGroupMembers).set({ leaderId: toId }).where(eq(leadershipGroupMembers.id, row.id));
    }
  }
  const asMemberRows = await tx
    .select()
    .from(leadershipGroupMembers)
    .where(eq(leadershipGroupMembers.memberVgLeaderId, fromId));
  for (const row of asMemberRows) {
    if (row.leaderId === toId) {
      await tx.delete(leadershipGroupMembers).where(eq(leadershipGroupMembers.id, row.id));
      continue;
    }
    const [existing] = await tx
      .select({ id: leadershipGroupMembers.id })
      .from(leadershipGroupMembers)
      .where(and(eq(leadershipGroupMembers.leaderId, row.leaderId), eq(leadershipGroupMembers.memberVgLeaderId, toId)))
      .limit(1);
    if (existing) {
      await tx.delete(leadershipGroupMembers).where(eq(leadershipGroupMembers.id, row.id));
    } else {
      await tx.update(leadershipGroupMembers).set({ memberVgLeaderId: toId }).where(eq(leadershipGroupMembers.id, row.id));
    }
  }
}

/**
 * Moves everything that points at a likely-duplicate leader record (participants as VG
 * leader/discipler, VG leaders who named it as their VG leader, leadership group links)
 * over to the claimed, completed record with a similar name. Unlike a merge, the source
 * record itself is left alone — not deleted, its fields and groups untouched.
 */
export async function moveVgLeaderConnections(fromId: number, toId: number): Promise<{ error: string } | undefined> {
  await requireDeveloper();
  if (fromId === toId) return { error: "Can't move connections to the same record." };

  try {
    await db.transaction(async (tx) => {
      const [[from], [to], [toAccount]] = await Promise.all([
        tx.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, fromId)).limit(1),
        tx.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, toId)).limit(1),
        tx.select({ pinHash: users.pinHash }).from(users).where(eq(users.vgLeaderId, toId)).limit(1),
      ]);
      if (!from || !to || to.deletedAt) throw new Error("One of the records no longer exists.");
      if (!areSimilarNames(from, to)) throw new Error("The records' names aren't similar enough to be duplicates.");
      if (!toAccount?.pinHash || !to.profileCompleted) {
        throw new Error("Connections can only be moved to a record that's claimed and has a completed profile.");
      }

      await tx.update(participants).set({ disciplerId: toId }).where(eq(participants.disciplerId, fromId));
      await tx.update(participants).set({ vgLeaderId: toId }).where(eq(participants.vgLeaderId, fromId));
      // The target naming its own duplicate as its VG leader would become a self-reference.
      await tx
        .update(victoryGroupLeaders)
        .set({ ownVgLeaderId: null, ownVgLeaderName: null })
        .where(and(eq(victoryGroupLeaders.id, toId), eq(victoryGroupLeaders.ownVgLeaderId, fromId)));
      await tx.update(victoryGroupLeaders).set({ ownVgLeaderId: toId }).where(eq(victoryGroupLeaders.ownVgLeaderId, fromId));
      await repointLeadershipGroupMembers(tx, fromId, toId);
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't move the connections." };
  }
  // The target's own VG leader name may have been cleared above.
  await recomputeProfileCompleted(toId);

  revalidatePath("/vg-leader-portal/leaders");
  await toastRedirectBack("Connections moved.");
}

export async function mergeVgLeaders(keepId: number, dropId: number): Promise<{ error: string } | undefined> {
  await requireDeveloper();
  if (keepId === dropId) return { error: "Can't merge a record with itself." };

  try {
    await db.transaction(async (tx) => {
    const [[keep], [drop]] = await Promise.all([
      tx.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, keepId)).limit(1),
      tx.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, dropId)).limit(1),
    ]);
    if (!keep || !drop) throw new Error("One of the selected records no longer exists.");

    // Fill in whatever the kept record is missing from the one being dropped.
    const patch: Record<string, unknown> = {};
    for (const field of MERGE_FIELDS) {
      if (isBlank(keep[field]) && !isBlank(drop[field])) patch[field] = drop[field];
    }
    // ownVgLeaderId is a self-reference — never let it end up pointing at the record
    // being dropped (dangling) or at the kept record itself (nonsensical self-reference).
    const resultingOwnVgLeaderId = "ownVgLeaderId" in patch ? patch.ownVgLeaderId : keep.ownVgLeaderId;
    if (resultingOwnVgLeaderId === dropId || resultingOwnVgLeaderId === keepId) {
      patch.ownVgLeaderId = null;
      patch.ownVgLeaderName = null;
    }
    patch.isLeadershipGroupLeader = keep.isLeadershipGroupLeader || drop.isLeadershipGroupLeader;
    patch.isActive = keep.isActive || drop.isActive;
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date();
      await tx.update(victoryGroupLeaders).set(patch).where(eq(victoryGroupLeaders.id, keepId));
    }

    // Plain repoints — no unique constraints in the way.
    await tx.update(participants).set({ disciplerId: keepId }).where(eq(participants.disciplerId, dropId));
    await tx.update(participants).set({ vgLeaderId: keepId }).where(eq(participants.vgLeaderId, dropId));
    await tx.update(victoryGroups).set({ vgLeaderId: keepId }).where(eq(victoryGroups.vgLeaderId, dropId));
    await tx.update(victoryGroupLeaders).set({ ownVgLeaderId: keepId }).where(eq(victoryGroupLeaders.ownVgLeaderId, dropId));

    await repointLeadershipGroupMembers(tx, dropId, keepId);

    // event_registrations: unique(eventId, vgLeaderId) — keep the kept record's registration
    // for a given event if it already has one; otherwise repoint the dropped record's.
    const regRows = await tx.select().from(eventRegistrations).where(eq(eventRegistrations.vgLeaderId, dropId));
    for (const row of regRows) {
      const [existing] = await tx
        .select({ id: eventRegistrations.id })
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.eventId, row.eventId), eq(eventRegistrations.vgLeaderId, keepId)))
        .limit(1);
      if (existing) {
        await tx.delete(eventRegistrations).where(eq(eventRegistrations.id, row.id));
      } else {
        await tx.update(eventRegistrations).set({ vgLeaderId: keepId }).where(eq(eventRegistrations.id, row.id));
      }
    }

    // event_check_ins: unique partial index on (eventId, vgLeaderId) where vgLeaderId is set.
    const checkInRows = await tx.select().from(eventCheckIns).where(eq(eventCheckIns.vgLeaderId, dropId));
    for (const row of checkInRows) {
      const [existing] = await tx
        .select({ id: eventCheckIns.id })
        .from(eventCheckIns)
        .where(and(eq(eventCheckIns.eventId, row.eventId), eq(eventCheckIns.vgLeaderId, keepId)))
        .limit(1);
      if (existing) {
        await tx.delete(eventCheckIns).where(eq(eventCheckIns.id, row.id));
      } else {
        await tx.update(eventCheckIns).set({ vgLeaderId: keepId }).where(eq(eventCheckIns.id, row.id));
      }
    }

    // users.vgLeaderId is unique — only repoint if the kept record doesn't already have
    // a portal account; if both somehow do, bail rather than silently orphaning one.
    const [dropAccount] = await tx.select().from(users).where(eq(users.vgLeaderId, dropId)).limit(1);
    if (dropAccount) {
      const [keepAccount] = await tx.select({ id: users.id }).from(users).where(eq(users.vgLeaderId, keepId)).limit(1);
      if (keepAccount) {
        throw new Error("Both records have a claimed portal account — resolve that manually before merging.");
      }
      await tx.update(users).set({ vgLeaderId: keepId }).where(eq(users.id, dropAccount.id));
    }

    await tx.update(victoryGroupLeaders).set({ deletedAt: new Date() }).where(eq(victoryGroupLeaders.id, dropId));
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't merge these records." };
  }
  // The kept record's fields and groups changed — derive completeness from them, not the old flags.
  await recomputeProfileCompleted(keepId);

  revalidatePath("/vg-leader-portal/leaders");
  revalidatePath("/vg-leader-portal/disciplers");
  await toastRedirectBack("Records merged.");
}

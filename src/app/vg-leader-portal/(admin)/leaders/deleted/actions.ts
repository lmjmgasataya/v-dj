"use server";

import { db } from "@/db";
import {
  victoryGroupLeaders,
  victoryGroups,
  interns,
  leadershipGroupMembers,
  participants,
  eventRegistrations,
  eventCheckIns,
  internEventRegistrations,
  users,
  loginLogs,
} from "@/db/schema";
import { and, eq, inArray, isNotNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { toastRedirect } from "@/lib/toast";
import { getRemainingConnections } from "./connections";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

async function isSoftDeleted(id: number) {
  const [leader] = await db
    .select({ id: victoryGroupLeaders.id })
    .from(victoryGroupLeaders)
    .where(and(eq(victoryGroupLeaders.id, id), isNotNull(victoryGroupLeaders.deletedAt)))
    .limit(1);
  return !!leader;
}

/**
 * Clears everything that still references a soft-deleted leader so it can be hard deleted.
 * Records that belong to someone else are unlinked, not deleted (participants, other VG
 * leaders, event check-ins keep their row); records that only exist for this leader are
 * deleted (leadership group links, event registrations, its own groups with their interns
 * and the interns' event registrations, and its portal account).
 */
export async function removeVgLeaderConnections(id: number): Promise<{ error: string } | undefined> {
  await requireDeveloper();
  if (!(await isSoftDeleted(id))) return { error: "Only soft-deleted records can have their connections removed." };

  try {
    await db.transaction(async (tx) => {
      await tx.update(participants).set({ vgLeaderId: null }).where(eq(participants.vgLeaderId, id));
      await tx.update(participants).set({ disciplerId: null }).where(eq(participants.disciplerId, id));
      // ownVgLeaderName is what they typed — keep it, just drop the link to this record.
      await tx.update(victoryGroupLeaders).set({ ownVgLeaderId: null }).where(eq(victoryGroupLeaders.ownVgLeaderId, id));
      await tx
        .delete(leadershipGroupMembers)
        .where(or(eq(leadershipGroupMembers.leaderId, id), eq(leadershipGroupMembers.memberVgLeaderId, id)));
      await tx.delete(eventRegistrations).where(eq(eventRegistrations.vgLeaderId, id));
      // Keep the check-in row (attendee name, time) so event attendance counts don't change.
      await tx.update(eventCheckIns).set({ vgLeaderId: null }).where(eq(eventCheckIns.vgLeaderId, id));

      const groupIds = (
        await tx.select({ id: victoryGroups.id }).from(victoryGroups).where(eq(victoryGroups.vgLeaderId, id))
      ).map((g) => g.id);
      if (groupIds.length > 0) {
        const internIds = (
          await tx.select({ id: interns.id }).from(interns).where(inArray(interns.victoryGroupId, groupIds))
        ).map((i) => i.id);
        if (internIds.length > 0) {
          await tx.update(eventCheckIns).set({ internId: null }).where(inArray(eventCheckIns.internId, internIds));
          await tx.delete(internEventRegistrations).where(inArray(internEventRegistrations.internId, internIds));
          await tx.delete(interns).where(inArray(interns.id, internIds));
        }
        await tx.delete(victoryGroups).where(inArray(victoryGroups.id, groupIds));
      }

      const accountIds = (await tx.select({ id: users.id }).from(users).where(eq(users.vgLeaderId, id))).map((u) => u.id);
      if (accountIds.length > 0) {
        await tx.update(loginLogs).set({ userId: null }).where(inArray(loginLogs.userId, accountIds));
        await tx.delete(users).where(inArray(users.id, accountIds));
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't remove the connections." };
  }

  revalidatePath("/vg-leader-portal/leaders/deleted");
  toastRedirect("/vg-leader-portal/leaders/deleted", "Connections removed.");
}

/** Permanently removes a soft-deleted leader record — only once nothing references it anymore. */
export async function hardDeleteVgLeader(id: number): Promise<{ error: string } | undefined> {
  await requireDeveloper();
  if (!(await isSoftDeleted(id))) return { error: "Only soft-deleted records can be permanently deleted." };

  const connections = (await getRemainingConnections([id])).get(id) ?? [];
  if (connections.length > 0) {
    return { error: "This record still has connections — move or remove them first." };
  }

  try {
    await db.delete(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, id));
  } catch {
    return { error: "Couldn't delete — something still references this record." };
  }

  revalidatePath("/vg-leader-portal/leaders/deleted");
  toastRedirect("/vg-leader-portal/leaders/deleted", "VG leader permanently deleted.");
}

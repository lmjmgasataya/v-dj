import { db } from "@/db";
import { victoryGroupLeaders, leadershipGroupMembers } from "@/db/schema";
import { and, eq, ilike, isNull, ne } from "drizzle-orm";
import { toTitleCase } from "@/lib/text";

/**
 * Resolves each "VG leader I lead" row the same match-by-name-or-create way as
 * resolveOwnVgLeader, but for a list. Field names: lgl_{i}_lastName / lgl_{i}_firstName / lgl_{i}_id.
 */
async function resolveMember(
  formData: FormData,
  index: number,
  excludeId: number,
): Promise<number | null> {
  const idRaw = (formData.get(`lgl_${index}_id`) as string) || "";
  const lastName = toTitleCase(((formData.get(`lgl_${index}_lastName`) as string) || "").trim());
  const firstName = toTitleCase(((formData.get(`lgl_${index}_firstName`) as string) || "").trim());

  if (!lastName && !firstName) return null;

  if (idRaw) return Number(idRaw);
  if (!lastName || !firstName) return null;

  const [existing] = await db
    .select({ id: victoryGroupLeaders.id })
    .from(victoryGroupLeaders)
    .where(
      and(
        ilike(victoryGroupLeaders.lastName, lastName),
        ilike(victoryGroupLeaders.firstName, firstName),
        ne(victoryGroupLeaders.id, excludeId),
        isNull(victoryGroupLeaders.deletedAt),
      ),
    )
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(victoryGroupLeaders)
    .values({ lastName, firstName, registeredMode: "vgl_edit_registration" })
    .returning({ id: victoryGroupLeaders.id });

  return created.id;
}

export async function resolveLeadershipGroupMembers(formData: FormData, excludeId: number): Promise<number[]> {
  const ids: number[] = [];
  for (let i = 0; ; i++) {
    const hasRow =
      formData.get(`lgl_${i}_lastName`) !== null ||
      formData.get(`lgl_${i}_firstName`) !== null ||
      formData.get(`lgl_${i}_id`) !== null;
    if (!hasRow) break;
    const id = await resolveMember(formData, i, excludeId);
    if (id != null && id !== excludeId && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Replace-all: deletes the leader's existing declared members and inserts the resolved set. */
export async function replaceLeadershipGroupMembers(leaderId: number, memberIds: number[]) {
  await db.delete(leadershipGroupMembers).where(eq(leadershipGroupMembers.leaderId, leaderId));
  if (memberIds.length > 0) {
    await db.insert(leadershipGroupMembers).values(memberIds.map((memberVgLeaderId) => ({ leaderId, memberVgLeaderId })));
  }
}

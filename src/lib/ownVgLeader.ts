import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { and, ilike, isNull, ne } from "drizzle-orm";
import { toTitleCase } from "@/lib/text";

/**
 * Resolves the "name of your own VG leader" fields the same way registration's
 * VG leader/discipler fields work: match an existing leader by last+first name,
 * or create a new victoryGroupLeaders record if none exists.
 */
export async function resolveOwnVgLeader(
  formData: FormData,
  excludeId: number,
): Promise<{ ownVgLeaderId: number | null; ownVgLeaderName: string | null }> {
  const idRaw = (formData.get("ownVgLeaderId") as string) || "";
  const lastName = toTitleCase(((formData.get("ownVgLeaderLastName") as string) || "").trim());
  const firstName = toTitleCase(((formData.get("ownVgLeaderFirstName") as string) || "").trim());

  if (!lastName && !firstName) return { ownVgLeaderId: null, ownVgLeaderName: null };

  if (idRaw) {
    return { ownVgLeaderId: Number(idRaw), ownVgLeaderName: `${lastName}, ${firstName}` };
  }

  if (!lastName || !firstName) {
    return { ownVgLeaderId: null, ownVgLeaderName: lastName || firstName };
  }

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

  if (existing) return { ownVgLeaderId: existing.id, ownVgLeaderName: `${lastName}, ${firstName}` };

  const [created] = await db
    .insert(victoryGroupLeaders)
    .values({ lastName, firstName })
    .returning({ id: victoryGroupLeaders.id });

  return { ownVgLeaderId: created.id, ownVgLeaderName: `${lastName}, ${firstName}` };
}

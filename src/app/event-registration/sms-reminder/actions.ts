"use server";

import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, users } from "@/db/schema";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";

export interface EventAudiencePerson {
  id: number;
  name: string;
  mobileNumber: string | null;
}

export async function getEventAudience(
  audience: ("vg_leader" | "intern")[]
): Promise<{ vgLeaders: EventAudiencePerson[]; interns: EventAudiencePerson[] }> {
  const allLeaders = await db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      mobileNumber: victoryGroupLeaders.mobileNumber,
    })
    .from(victoryGroupLeaders)
    .where(isNull(victoryGroupLeaders.deletedAt))
    .orderBy(victoryGroupLeaders.lastName);

  let vgLeaders: EventAudiencePerson[] = [];
  if (audience.includes("vg_leader")) {
    const claimedLeaders = await db
      .select({
        id: victoryGroupLeaders.id,
        lastName: victoryGroupLeaders.lastName,
        firstName: victoryGroupLeaders.firstName,
        mobileNumber: victoryGroupLeaders.mobileNumber,
      })
      .from(victoryGroupLeaders)
      .innerJoin(users, and(eq(users.vgLeaderId, victoryGroupLeaders.id), eq(users.role, "vg_leader")))
      .where(and(isNotNull(users.pinHash), isNull(victoryGroupLeaders.deletedAt)))
      .orderBy(victoryGroupLeaders.lastName);

    vgLeaders = claimedLeaders.map((r) => ({ id: r.id, name: `${r.lastName}, ${r.firstName}`, mobileNumber: r.mobileNumber }));
  }

  let interns: EventAudiencePerson[] = [];
  if (audience.includes("intern")) {
    const rows = await db
      .selectDistinct({ intern: victoryGroups.intern })
      .from(victoryGroups)
      .where(
        and(
          isNull(victoryGroups.deletedAt),
          eq(victoryGroups.isActive, true),
          sql`${victoryGroups.intern} is not null and trim(${victoryGroups.intern}) <> '' and lower(${victoryGroups.intern}) <> 'none'`
        )
      );

    const leaderByName = new Map(
      allLeaders.map((r) => [`${r.lastName.trim().toLowerCase()}|${r.firstName.trim().toLowerCase()}`, r])
    );

    const names = Array.from(new Set(rows.map((r) => (r.intern as string).trim())));
    interns = names
      .sort((a, b) => a.localeCompare(b))
      .map((name, i) => {
        const parts = name.split(",").map((p) => p.trim());
        const match =
          parts.length === 2 ? leaderByName.get(`${parts[0].toLowerCase()}|${parts[1].toLowerCase()}`) : undefined;
        return { id: -(i + 1), name, mobileNumber: match?.mobileNumber ?? null };
      });
  }

  return { vgLeaders, interns };
}

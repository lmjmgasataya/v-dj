import { db } from "@/db";
import { interns, victoryGroups, victoryGroupLeaders } from "@/db/schema";
import { and, or, ilike, isNull, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) return NextResponse.json([]);

  const results = await db
    .select({
      id: interns.id,
      lastName: interns.lastName,
      firstName: interns.firstName,
      leaderLastName: victoryGroupLeaders.lastName,
      leaderFirstName: victoryGroupLeaders.firstName,
    })
    .from(interns)
    .innerJoin(victoryGroups, eq(interns.victoryGroupId, victoryGroups.id))
    .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
    .where(
      and(
        isNull(victoryGroups.deletedAt),
        or(ilike(interns.lastName, `%${q}%`), ilike(interns.firstName, `%${q}%`))
      )
    )
    .orderBy(interns.lastName)
    .limit(10);

  return NextResponse.json(results);
}

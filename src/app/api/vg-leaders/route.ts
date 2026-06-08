import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { and, or, ilike, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) return NextResponse.json([]);

  const results = await db
    .select()
    .from(victoryGroupLeaders)
    .where(
      and(
        isNull(victoryGroupLeaders.deletedAt),
        or(
          ilike(victoryGroupLeaders.lastName, `%${q}%`),
          ilike(victoryGroupLeaders.firstName, `%${q}%`)
        )
      )
    )
    .orderBy(victoryGroupLeaders.lastName)
    .limit(10);

  return NextResponse.json(results);
}

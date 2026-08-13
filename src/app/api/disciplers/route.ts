import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { or, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) return NextResponse.json([]);

  const results = await db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      mobileNumber: victoryGroupLeaders.mobileNumber,
      messengerName: victoryGroupLeaders.facebookMessengerName,
    })
    .from(victoryGroupLeaders)
    .where(
      or(
        ilike(victoryGroupLeaders.lastName, `%${q}%`),
        ilike(victoryGroupLeaders.firstName, `%${q}%`)
      )
    )
    .orderBy(victoryGroupLeaders.lastName)
    .limit(10);

  return NextResponse.json(results);
}

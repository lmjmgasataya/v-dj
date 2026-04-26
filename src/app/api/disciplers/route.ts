import { db } from "@/db";
import { disciplers } from "@/db/schema";
import { or, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) return NextResponse.json([]);

  const results = await db
    .select()
    .from(disciplers)
    .where(
      or(
        ilike(disciplers.lastName, `%${q}%`),
        ilike(disciplers.firstName, `%${q}%`)
      )
    )
    .orderBy(disciplers.lastName)
    .limit(10);

  return NextResponse.json(results);
}

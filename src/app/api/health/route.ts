import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

// Uses the app's shared pool rather than opening (and tearing down) a new connection per call,
// which cost a full TLS + auth handshake to Supabase every time.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", db: "unreachable", detail: String(error) },
      { status: 503 }
    );
  }
}

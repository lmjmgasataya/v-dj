import { NextResponse } from "next/server";

// Deliberately does nothing but respond — used by useConnectionQuality to
// measure round-trip latency/reachability to the server itself, decoupled
// from DB health (unlike /api/health, which opens a real DB connection per
// call and is too heavy to poll every few seconds from every device).
export async function GET() {
  return NextResponse.json({ ok: true });
}

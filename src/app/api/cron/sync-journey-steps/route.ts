import { NextRequest, NextResponse } from "next/server";
import { syncJourneyStepsFromDjPortal } from "@/lib/djPortalJourney";

// Daily at midnight Asia/Manila (16:00 UTC, see vercel.json). Check-ins already trigger the sync
// right away; this catches everything else — check-ins edited or merged elsewhere, and leaders
// added after they finished a class — and backfills attendance recorded before the sync existed.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const added = await syncJourneyStepsFromDjPortal();
    return NextResponse.json({ ok: true, added });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

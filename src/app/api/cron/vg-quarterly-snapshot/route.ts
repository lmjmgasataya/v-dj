import { db } from "@/db";
import { vgReportSnapshots } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { computeVgSnapshotCounts } from "@/lib/vgSnapshotCompute";
import { getLiveQuarter } from "@/lib/vgQuarters";
import { todayPH } from "@/lib/date";
import type { VgSnapshotData } from "@/lib/vgSnapshot";

// Runs once on each quarter-end date — Mar 31 / Jun 30 / Sep 30 / Dec 31, 7:00 AM Asia/Manila
// time (see vercel.json; expressed there as 23:00 UTC the day before, since PH is UTC+8) —
// so getLiveQuarter() still reads the closing quarter when this fires, freezing that
// quarter's numbers (including quarterlyUpdateStatus) on its last day.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const liveQuarter = getLiveQuarter();
    if (!liveQuarter) {
      return NextResponse.json({ ok: false, error: "No live quarter" }, { status: 500 });
    }

    const [lastSnapshot] = await db
      .select({ data: vgReportSnapshots.data })
      .from(vgReportSnapshots)
      .orderBy(desc(vgReportSnapshots.id))
      .limit(1);
    const previousGoals = (lastSnapshot?.data as VgSnapshotData | undefined)?.goals;

    const computed = await computeVgSnapshotCounts();
    const data: VgSnapshotData = {
      ...computed,
      goals: previousGoals ?? { vgLeaders: 0, leadershipGroups: 0 },
    };
    const asOfDate = todayPH();

    await db
      .insert(vgReportSnapshots)
      .values({ label: liveQuarter.label, asOfDate, data })
      .onConflictDoUpdate({ target: vgReportSnapshots.label, set: { asOfDate, data } });

    return NextResponse.json({ ok: true, label: liveQuarter.label, asOfDate });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

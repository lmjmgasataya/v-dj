import { db } from "@/db";
import { loginLogs, smsLogs } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const SMS_LOG_RETENTION_DAYS = 5;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [row] = await db
      .insert(loginLogs)
      .values({ username: "__keep_alive__", success: false })
      .returning({ id: loginLogs.id });

    await db.delete(loginLogs).where(eq(loginLogs.id, row.id));

    const cutoff = new Date(Date.now() - SMS_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await db.delete(smsLogs).where(lt(smsLogs.createdAt, cutoff));

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

import { db } from "@/db";
import { loginLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { getTableColumns } from "drizzle-orm";
import { toCSV } from "@/lib/csv";
import { DEVOPS_TABLES } from "@/lib/devopsTables";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("table") ?? "";
  const entry = DEVOPS_TABLES.find((t) => t.key === key);
  if (!entry) return NextResponse.json({ error: "Unknown table" }, { status: 400 });

  let csv = "";
  try {
    // Secrets (password / PIN hashes, SMS API keys) never leave the database.
    const columns = Object.fromEntries(
      Object.entries(getTableColumns(entry.table)).filter(([name]) => !entry.omit?.includes(name))
    );
    csv = toCSV((await db.select(columns).from(entry.table)) as Record<string, unknown>[]);
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }

  const date = new Date().toISOString().split("T")[0];
  return new NextResponse(csv || "", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${key}_${date}.csv"`,
    },
  });
}

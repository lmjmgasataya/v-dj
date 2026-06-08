import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import {
  participants, disciplers, victoryGroupLeaders, victoryGroups,
  classSessions, checkIns, users, loginLogs, featureFlags,
} from "@/db/schema";
import { toCSV } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const table = req.nextUrl.searchParams.get("table") ?? "";
  let csv = "";
  const filename = table;

  try {
    switch (table) {
      case "participants":
        csv = toCSV((await db.select().from(participants)) as Record<string, unknown>[]);
        break;
      case "disciplers":
        csv = toCSV((await db.select().from(disciplers)) as Record<string, unknown>[]);
        break;
      case "vg_leaders":
        csv = toCSV((await db.select().from(victoryGroupLeaders)) as Record<string, unknown>[]);
        break;
      case "vg_groups":
        csv = toCSV((await db.select().from(victoryGroups)) as Record<string, unknown>[]);
        break;
      case "class_sessions":
        csv = toCSV((await db.select().from(classSessions)) as Record<string, unknown>[]);
        break;
      case "check_ins":
        csv = toCSV((await db.select().from(checkIns)) as Record<string, unknown>[]);
        break;
      case "users":
        // exclude passwordHash
        csv = toCSV(
          (await db.select({ id: users.id, username: users.username, name: users.name, role: users.role, createdAt: users.createdAt }).from(users)) as Record<string, unknown>[]
        );
        break;
      case "login_logs":
        csv = toCSV((await db.select().from(loginLogs)) as Record<string, unknown>[]);
        break;
      case "feature_flags":
        csv = toCSV((await db.select().from(featureFlags)) as Record<string, unknown>[]);
        break;
      default:
        return NextResponse.json({ error: "Unknown table" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }

  const date = new Date().toISOString().split("T")[0];
  return new NextResponse(csv || "", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}_${date}.csv"`,
    },
  });
}

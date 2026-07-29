import { db } from "@/db";
import { checkIns } from "@/db/schema";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { getTableSettings } from "@/lib/settings";

export async function assignTableNumber(classSessionId: number): Promise<number | null> {
  const { tableCapacity, totalTables } = await getTableSettings();

  const [{ occupied }] = await db
    .select({ occupied: count() })
    .from(checkIns)
    .where(and(eq(checkIns.classSessionId, classSessionId), isNotNull(checkIns.tableNumber)));

  const nextTable = Math.floor(occupied / tableCapacity) + 1;
  return nextTable <= totalTables ? nextTable : null;
}

import { db } from "@/db";
import { checkIns, appSettings } from "@/db/schema";
import { and, count, eq, isNotNull, sql } from "drizzle-orm";

export interface TableRange {
  start: number;
  end: number;
  capacity: number;
}

const TABLE_RANGES_KEY = "table_ranges";

// Tables aren't uniform: the front rows seat more than the back rows.
const DEFAULT_TABLE_RANGES: TableRange[] = [
  { start: 1, end: 10, capacity: 7 },
  { start: 11, end: 19, capacity: 6 },
];

export async function getTableRanges(): Promise<TableRange[]> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, TABLE_RANGES_KEY));
  if (!row) return DEFAULT_TABLE_RANGES;

  try {
    const parsed = JSON.parse(row.value);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fall through to default
  }
  return DEFAULT_TABLE_RANGES;
}

export async function setTableRanges(ranges: TableRange[]): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: TABLE_RANGES_KEY, value: JSON.stringify(ranges) })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: sql`excluded.value`, updatedAt: new Date() },
    });
}

export function getTotalTables(ranges: TableRange[]): number {
  return ranges.reduce((max, range) => Math.max(max, range.end), 0);
}

export function getTotalSeats(ranges: TableRange[]): number {
  return ranges.reduce((sum, range) => sum + range.capacity * (range.end - range.start + 1), 0);
}

export function getTableCapacity(tableNumber: number, ranges: TableRange[]): number {
  const range = ranges.find((r) => tableNumber >= r.start && tableNumber <= r.end);
  if (!range) throw new Error(`No capacity defined for table ${tableNumber}`);
  return range.capacity;
}

export async function assignTableNumber(classSessionId: number): Promise<number | null> {
  const ranges = await getTableRanges();

  const rows = await db
    .select({ tableNumber: checkIns.tableNumber, occupied: count() })
    .from(checkIns)
    .where(and(eq(checkIns.classSessionId, classSessionId), isNotNull(checkIns.tableNumber)))
    .groupBy(checkIns.tableNumber);

  const occupiedByTable = new Map(rows.map((r) => [r.tableNumber!, r.occupied]));

  for (const range of ranges) {
    for (let table = range.start; table <= range.end; table++) {
      if ((occupiedByTable.get(table) ?? 0) < range.capacity) return table;
    }
  }
  return null;
}

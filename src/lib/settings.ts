import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function getAppSetting(key: string, defaultValue: string): Promise<string> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return row?.value ?? defaultValue;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: sql`excluded.value`, updatedAt: new Date() },
    });
}

export async function getTableSettings(): Promise<{ tableCapacity: number; totalTables: number }> {
  const [tableCapacity, totalTables] = await Promise.all([
    getAppSetting("table_capacity", "7"),
    getAppSetting("total_tables", "16"),
  ]);
  return { tableCapacity: parseInt(tableCapacity, 10), totalTables: parseInt(totalTables, 10) };
}

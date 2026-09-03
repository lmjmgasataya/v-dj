import { db } from "@/db";
import { interns, eventCheckIns, internEventRegistrations } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { toTitleCase } from "@/lib/text";

export function parseInternRows(formData: FormData): { lastName: string; firstName: string }[] {
  const rows: { lastName: string; firstName: string }[] = [];
  for (let i = 0; ; i++) {
    const lastName = formData.get(`intern_${i}_lastName`);
    const firstName = formData.get(`intern_${i}_firstName`);
    if (lastName === null && firstName === null) break;
    const trimmedLast = toTitleCase(((lastName as string) || "").trim());
    const trimmedFirst = toTitleCase(((firstName as string) || "").trim());
    if (trimmedLast || trimmedFirst) rows.push({ lastName: trimmedLast, firstName: trimmedFirst });
  }
  return rows;
}

/**
 * Reconciles a group's interns with the resubmitted set: interns present in both are left
 * untouched (preserving their id, so any event check-ins/registrations stay valid), new names
 * are inserted, and names no longer present are removed — hard-deleted if they're not linked to
 * any event (nothing references them), soft-deleted otherwise (hard deleting would fail with a
 * FK violation for an intern who already has a check-in or event registration).
 */
export async function replaceGroupInterns(victoryGroupId: number, formData: FormData) {
  const rows = parseInternRows(formData);

  const existing = await db
    .select({ id: interns.id, lastName: interns.lastName, firstName: interns.firstName })
    .from(interns)
    .where(and(eq(interns.victoryGroupId, victoryGroupId), isNull(interns.deletedAt)));

  const remaining = [...existing];
  const toInsert: { lastName: string; firstName: string }[] = [];

  for (const row of rows) {
    const matchIndex = remaining.findIndex((e) => e.lastName === row.lastName && e.firstName === row.firstName);
    if (matchIndex >= 0) {
      remaining.splice(matchIndex, 1);
    } else {
      toInsert.push(row);
    }
  }

  const removedIds = remaining.map((e) => e.id);

  if (removedIds.length > 0) {
    const [checkedIn, registered] = await Promise.all([
      db.select({ internId: eventCheckIns.internId }).from(eventCheckIns).where(inArray(eventCheckIns.internId, removedIds)),
      db.select({ internId: internEventRegistrations.internId }).from(internEventRegistrations).where(inArray(internEventRegistrations.internId, removedIds)),
    ]);
    const linkedIds = new Set<number>();
    for (const r of checkedIn) if (r.internId != null) linkedIds.add(r.internId);
    for (const r of registered) linkedIds.add(r.internId);

    const softDeleteIds = removedIds.filter((id) => linkedIds.has(id));
    const hardDeleteIds = removedIds.filter((id) => !linkedIds.has(id));

    if (softDeleteIds.length > 0) {
      await db.update(interns).set({ deletedAt: new Date() }).where(inArray(interns.id, softDeleteIds));
    }
    if (hardDeleteIds.length > 0) {
      await db.delete(interns).where(inArray(interns.id, hardDeleteIds));
    }
  }
  if (toInsert.length > 0) {
    await db.insert(interns).values(toInsert.map((r) => ({ victoryGroupId, ...r })));
  }
}

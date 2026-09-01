import { db } from "@/db";
import { interns } from "@/db/schema";
import { eq } from "drizzle-orm";
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

/** Replace-all: deletes the group's existing interns and inserts the resubmitted set. */
export async function replaceGroupInterns(victoryGroupId: number, formData: FormData) {
  const rows = parseInternRows(formData);
  await db.delete(interns).where(eq(interns.victoryGroupId, victoryGroupId));
  if (rows.length > 0) {
    await db.insert(interns).values(rows.map((r) => ({ victoryGroupId, ...r })));
  }
}

"use server";

import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setTableRanges, type TableRange } from "@/lib/tables";
import { toastRedirectBack } from "@/lib/toast";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
  return session;
}

export async function setTableAssignmentFlag(enabled: boolean) {
  await requireDeveloper();

  await db
    .insert(featureFlags)
    .values({ key: "checkin_table_assignment", enabled })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedAt: new Date() },
    });

  revalidatePath("/table-management/settings");
  revalidatePath("/admin");
  await toastRedirectBack("Setting updated.");
}

export async function updateTableRanges(ranges: TableRange[]) {
  await requireDeveloper();

  const cleaned = ranges.map((r) => ({
    start: Number(r.start),
    end: Number(r.end),
    capacity: Number(r.capacity),
  }));

  for (const r of cleaned) {
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end) || !Number.isInteger(r.capacity)) {
      await toastRedirectBack("Table ranges must be whole numbers.", "error");
    }
    if (r.start < 1 || r.end < r.start || r.capacity < 1) {
      await toastRedirectBack("Each range needs a valid start, end, and capacity.", "error");
    }
  }
  if (cleaned.length === 0) {
    await toastRedirectBack("Add at least one table range.", "error");
  }

  const sorted = [...cleaned].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start <= sorted[i - 1].end) {
      await toastRedirectBack("Table ranges cannot overlap.", "error");
    }
  }

  await setTableRanges(sorted);
  revalidatePath("/table-management/settings");
  revalidatePath("/table-management/assignments");
  await toastRedirectBack("Table ranges updated.");
}

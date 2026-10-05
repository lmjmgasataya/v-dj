"use server";

import { db } from "@/db";
import { vgReportSnapshots, vgConvergenceAttendance, leadership113Batches } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SERVICE_BUCKETS, emptyBucketCounts, type DrillItem, type VgSnapshotData, type VgBucketCounts } from "@/lib/vgSnapshot";
import { computeVgSnapshotCounts } from "@/lib/vgSnapshotCompute";
import { allDrillLists, reportSnapshotData, type ShownDrillLists } from "./drillData";
import { addDrillReasons, type ReasonSide } from "./drillReasons";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

/**
 * The name lists behind every number of one comparison (`a` vs `b`), fetched when a number is
 * first clicked instead of being sent with the page. `a` is a snapshot id or "live".
 */
export async function getDrillLists(a: number | "live", b: number | null): Promise<Record<string, ShownDrillLists>> {
  await requireDeveloper();
  const ids = [...(a === "live" ? [] : [a]), ...(b != null ? [b] : [])];
  const [rows, live] = await Promise.all([
    ids.length > 0
      ? db
          .select({
            id: vgReportSnapshots.id,
            label: vgReportSnapshots.label,
            asOfDate: vgReportSnapshots.asOfDate,
            data: reportSnapshotData(),
          })
          .from(vgReportSnapshots)
          .where(inArray(vgReportSnapshots.id, ids))
      : Promise.resolve([]),
    a === "live" ? computeVgSnapshotCounts() : Promise.resolve(null),
  ]);
  const side = (id: number | null): ReasonSide | null => {
    const row = rows.find((r) => r.id === id);
    if (!row) return null;
    const data = row.data as VgSnapshotData;
    // End of the as-of day in Manila, so records created that day count as "before".
    return { label: row.label, data, isLive: false, asOfDate: new Date(`${row.asOfDate}T23:59:59+08:00`), source: data.source };
  };

  const latest: ReasonSide | null = live
    ? { label: "Live Now", data: { ...live, goals: { vgLeaders: 0, leadershipGroups: 0 } }, isLive: true, asOfDate: new Date() }
    : side(a as number);
  if (!latest) return {};
  const previous = side(b);
  const lists = allDrillLists(latest, previous);
  await addDrillReasons(lists, latest, previous);

  // Drop the matching keys — the popup only shows label, service and reason.
  const shown = (items: DrillItem[] | null) => items?.map(({ label, service, reason, remarks }) => ({ label, service, reason, remarks })) ?? null;
  return Object.fromEntries(
    Object.entries(lists).map(([k, l]) => [
      k,
      { detail: shown(l.detail), prevDetail: shown(l.prevDetail), added: shown(l.added), removed: shown(l.removed), kept: shown(l.kept) },
    ]),
  );
}

const MANUAL_FIELDS: (keyof VgBucketCounts)[] = ["vgLeaders", "victoryGroups", "interns", "leadershipGroups"];

function computeManualSnapshotCounts(
  formData: FormData
): Pick<VgSnapshotData, "byService" | "totals" | "vglByGender" | "genderTotals"> {
  const byService = {} as Record<(typeof SERVICE_BUCKETS)[number], VgBucketCounts>;
  const vglByGender = {} as Record<(typeof SERVICE_BUCKETS)[number], { male: number; female: number }>;
  const totals = emptyBucketCounts();
  const genderTotals = { male: 0, female: 0 };

  SERVICE_BUCKETS.forEach((bucket, i) => {
    const counts = emptyBucketCounts();
    for (const field of MANUAL_FIELDS) {
      const value = Number(formData.get(`m_${i}_${field}`) || 0);
      counts[field] = value;
      totals[field] += value;
    }
    byService[bucket] = counts;

    const male = Number(formData.get(`m_${i}_male`) || 0);
    const female = Number(formData.get(`m_${i}_female`) || 0);
    vglByGender[bucket] = { male, female };
    genderTotals.male += male;
    genderTotals.female += female;
  });

  return { byService, totals, vglByGender, genderTotals };
}

export async function createVgReportSnapshot(formData: FormData) {
  await requireDeveloper();

  const label = (formData.get("label") as string).trim();
  const asOfDate = formData.get("asOfDate") as string;
  const vgLeadersGoal = Number(formData.get("vgLeadersGoal") || 0);
  const leadershipGroupsGoal = Number(formData.get("leadershipGroupsGoal") || 0);
  const mode = (formData.get("mode") as string) === "manual" ? "manual" : "auto";

  const computed = mode === "manual" ? computeManualSnapshotCounts(formData) : await computeVgSnapshotCounts();

  const data: VgSnapshotData = {
    ...computed,
    goals: { vgLeaders: vgLeadersGoal, leadershipGroups: leadershipGroupsGoal },
  };

  await db
    .insert(vgReportSnapshots)
    .values({ label, asOfDate, data })
    .onConflictDoUpdate({ target: vgReportSnapshots.label, set: { asOfDate, data } });

  revalidatePath("/vg-leader-portal/quarterly-report");
}

export async function updateVgReportSnapshot(id: number, formData: FormData) {
  await requireDeveloper();

  const [existing] = await db.select({ data: vgReportSnapshots.data }).from(vgReportSnapshots).where(eq(vgReportSnapshots.id, id));
  const source = (existing?.data as VgSnapshotData | undefined)?.source;
  if (source === "cron" || source === "form") {
    throw new Error("Auto- and form-generated snapshots can't be edited — delete it instead if it needs to be replaced.");
  }

  const label = (formData.get("label") as string).trim();
  const asOfDate = formData.get("asOfDate") as string;
  const vgLeadersGoal = Number(formData.get("vgLeadersGoal") || 0);
  const leadershipGroupsGoal = Number(formData.get("leadershipGroupsGoal") || 0);

  // Editing always overrides every number by hand — the previous snapshot's drill-down
  // (detailsByService/totalsDetail) no longer necessarily matches, so it's dropped here.
  const data: VgSnapshotData = {
    ...computeManualSnapshotCounts(formData),
    goals: { vgLeaders: vgLeadersGoal, leadershipGroups: leadershipGroupsGoal },
  };

  await db.update(vgReportSnapshots).set({ label, asOfDate, data }).where(eq(vgReportSnapshots.id, id));

  revalidatePath("/vg-leader-portal/quarterly-report");
}

export async function deleteVgReportSnapshot(id: number) {
  await requireDeveloper();
  await db.delete(vgReportSnapshots).where(eq(vgReportSnapshots.id, id));
  revalidatePath("/vg-leader-portal/quarterly-report");
}

export async function addConvergenceAttendance(formData: FormData) {
  await requireDeveloper();
  await db.insert(vgConvergenceAttendance).values({
    label: (formData.get("label") as string).trim(),
    eventDate: formData.get("eventDate") as string,
    attendees: Number(formData.get("attendees") || 0),
  });
  revalidatePath("/vg-leader-portal/quarterly-report");
}

export async function deleteConvergenceAttendance(id: number) {
  await requireDeveloper();
  await db.delete(vgConvergenceAttendance).where(eq(vgConvergenceAttendance.id, id));
  revalidatePath("/vg-leader-portal/quarterly-report");
}

export async function addLeadership113Batch(formData: FormData) {
  await requireDeveloper();
  await db.insert(leadership113Batches).values({
    batchName: (formData.get("batchName") as string).trim(),
    actual: Number(formData.get("actual") || 0),
    goal: Number(formData.get("goal") || 0),
  });
  revalidatePath("/vg-leader-portal/quarterly-report");
}

export async function deleteLeadership113Batch(id: number) {
  await requireDeveloper();
  await db.delete(leadership113Batches).where(eq(leadership113Batches.id, id));
  revalidatePath("/vg-leader-portal/quarterly-report");
}

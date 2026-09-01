"use server";

import { db } from "@/db";
import { vgReportSnapshots, vgConvergenceAttendance, leadership113Batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SERVICE_BUCKETS, emptyBucketCounts, type VgSnapshotData, type VgBucketCounts } from "@/lib/vgSnapshot";
import { computeVgSnapshotCounts } from "@/lib/vgSnapshotCompute";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
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

  revalidatePath("/manage-vg-leaders/quarterly-report");
}

export async function updateVgReportSnapshot(id: number, formData: FormData) {
  await requireDeveloper();

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

  revalidatePath("/manage-vg-leaders/quarterly-report");
}

export async function deleteVgReportSnapshot(id: number) {
  await requireDeveloper();
  await db.delete(vgReportSnapshots).where(eq(vgReportSnapshots.id, id));
  revalidatePath("/manage-vg-leaders/quarterly-report");
}

export async function addConvergenceAttendance(formData: FormData) {
  await requireDeveloper();
  await db.insert(vgConvergenceAttendance).values({
    label: (formData.get("label") as string).trim(),
    eventDate: formData.get("eventDate") as string,
    attendees: Number(formData.get("attendees") || 0),
  });
  revalidatePath("/manage-vg-leaders/quarterly-report");
}

export async function deleteConvergenceAttendance(id: number) {
  await requireDeveloper();
  await db.delete(vgConvergenceAttendance).where(eq(vgConvergenceAttendance.id, id));
  revalidatePath("/manage-vg-leaders/quarterly-report");
}

export async function addLeadership113Batch(formData: FormData) {
  await requireDeveloper();
  await db.insert(leadership113Batches).values({
    batchName: (formData.get("batchName") as string).trim(),
    actual: Number(formData.get("actual") || 0),
    goal: Number(formData.get("goal") || 0),
  });
  revalidatePath("/manage-vg-leaders/quarterly-report");
}

export async function deleteLeadership113Batch(id: number) {
  await requireDeveloper();
  await db.delete(leadership113Batches).where(eq(leadership113Batches.id, id));
  revalidatePath("/manage-vg-leaders/quarterly-report");
}

"use server";

import { db } from "@/db";
import { vgReportSnapshots, vgConvergenceAttendance, leadership113Batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { VgSnapshotData } from "@/lib/vgSnapshot";
import { computeVgSnapshotCounts } from "@/lib/vgSnapshotCompute";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function createVgReportSnapshot(formData: FormData) {
  await requireDeveloper();

  const label = (formData.get("label") as string).trim();
  const asOfDate = formData.get("asOfDate") as string;
  const vgLeadersGoal = Number(formData.get("vgLeadersGoal") || 0);
  const leadershipGroupsGoal = Number(formData.get("leadershipGroupsGoal") || 0);

  const computed = await computeVgSnapshotCounts();

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

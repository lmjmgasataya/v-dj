import { db } from "@/db";
import { l113Batches, l113BatchStudents, l113Schedules, l113ScheduleDates, l113Teachers, l113Topics, victoryGroupLeaders } from "@/db/schema";
import type { L113Batch } from "@/db/schema";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { todayPH } from "@/lib/date";
import { l113StudentKey } from "@/lib/l113";

/** L113 Portal mutations: developer or lead_pastor (same as the portal's layout). */
export async function requireL113Admin() {
  const session = await getSession();
  if (!session || (session.role !== "developer" && session.role !== "lead_pastor")) redirect("/");
  return session;
}

export async function getL113Batches(): Promise<L113Batch[]> {
  return db.select().from(l113Batches).orderBy(desc(l113Batches.startDate), desc(l113Batches.id));
}

/**
 * The batch picked by `?batch=`, else the one running today, else the latest. Batches are
 * sorted newest first.
 */
export function pickBatch(batches: L113Batch[], param: string | undefined): L113Batch | null {
  if (param) {
    const found = batches.find((b) => String(b.id) === param);
    if (found) return found;
  }
  const today = todayPH();
  return batches.find((b) => b.startDate <= today && today <= b.endDate) ?? batches[0] ?? null;
}

export interface L113Student {
  vgLeaderId: number;
  /** "Last, First" */
  name: string;
  lastName: string;
  firstName: string;
  nickname: string | null;
  service: string | null;
}

export async function getBatchStudents(batchId: number): Promise<L113Student[]> {
  const rows = await db
    .select({
      vgLeaderId: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      nickname: victoryGroupLeaders.nickname,
      service: victoryGroupLeaders.serviceAttending,
    })
    .from(l113BatchStudents)
    .innerJoin(victoryGroupLeaders, eq(victoryGroupLeaders.id, l113BatchStudents.vgLeaderId))
    .where(eq(l113BatchStudents.batchId, batchId))
    .orderBy(asc(victoryGroupLeaders.lastName), asc(victoryGroupLeaders.firstName));
  return rows.map((r) => ({
    vgLeaderId: r.vgLeaderId,
    name: `${r.lastName}, ${r.firstName}`,
    lastName: r.lastName,
    firstName: r.firstName,
    nickname: r.nickname,
    service: r.service,
  }));
}

export interface L113ScheduleWithDates {
  id: number;
  topicId: number;
  topic: string;
  /** Null only for a break row. */
  teacherId: number | null;
  /** The teacher's name ("" for a break row). */
  teacher: string;
  isBreak: boolean;
  remarks: string | null;
  dates: { id: number; classDate: string }[];
}

/**
 * A batch's topics with their dates, in order of each topic's first date. Break rows (SEM
 * BREAK etc.) are left out unless `includeBreaks` — only the schedule page shows them.
 */
export async function getBatchSchedule(batchId: number, { includeBreaks = false } = {}): Promise<L113ScheduleWithDates[]> {
  const schedules = await db
    .select({
      id: l113Schedules.id,
      topicId: l113Schedules.topicId,
      topic: l113Topics.name,
      teacherId: l113Schedules.teacherId,
      teacher: l113Teachers.name,
      isBreak: l113Schedules.isBreak,
      remarks: l113Schedules.remarks,
    })
    .from(l113Schedules)
    .innerJoin(l113Topics, eq(l113Topics.id, l113Schedules.topicId))
    .leftJoin(l113Teachers, eq(l113Teachers.id, l113Schedules.teacherId))
    .where(includeBreaks ? eq(l113Schedules.batchId, batchId) : and(eq(l113Schedules.batchId, batchId), eq(l113Schedules.isBreak, false)));
  if (schedules.length === 0) return [];
  const dates = await db
    .select()
    .from(l113ScheduleDates)
    .where(inArray(l113ScheduleDates.scheduleId, schedules.map((s) => s.id)))
    .orderBy(asc(l113ScheduleDates.classDate));
  return schedules
    .map((s) => ({
      ...s,
      teacher: s.teacher ?? "",
      dates: dates.filter((d) => d.scheduleId === s.id).map((d) => ({ id: d.id, classDate: d.classDate })),
    }))
    .sort((a, b) => (a.dates[0]?.classDate ?? "9999").localeCompare(b.dates[0]?.classDate ?? "9999") || a.id - b.id);
}

export async function getL113Teachers(): Promise<{ id: number; name: string }[]> {
  return db.select({ id: l113Teachers.id, name: l113Teachers.name }).from(l113Teachers).orderBy(asc(l113Teachers.name));
}

export async function getL113Topics(): Promise<{ id: number; name: string }[]> {
  return db.select({ id: l113Topics.id, name: l113Topics.name }).from(l113Topics).orderBy(asc(l113Topics.name));
}

/** The newest L113 batch a VG leader is a student of. */
export async function getStudentBatch(vgLeaderId: number): Promise<L113Batch | null> {
  const [row] = await db
    .select({ batch: l113Batches })
    .from(l113BatchStudents)
    .innerJoin(l113Batches, eq(l113Batches.id, l113BatchStudents.batchId))
    .where(eq(l113BatchStudents.vgLeaderId, vgLeaderId))
    .orderBy(desc(l113Batches.startDate), desc(l113Batches.id))
    .limit(1);
  return row?.batch ?? null;
}

/** How long after a batch ends its students still appear on the public forms. */
const FORM_GRACE_DAYS = 31;

export interface L113FormStudent {
  /** l113StudentKey(batchId, vgLeaderId) */
  key: string;
  batchId: number;
  vgLeaderId: number;
  /** "Last, First (Nickname)" */
  label: string;
}

/**
 * Batches and students listed on the public forms: batches that haven't ended more than
 * FORM_GRACE_DAYS ago (so last month's report can still come in), else the newest batch.
 */
export async function getL113FormStudents(): Promise<{ batches: L113Batch[]; students: L113FormStudent[] }> {
  const cutoff = new Date(`${todayPH()}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - FORM_GRACE_DAYS);
  let batches = await db
    .select()
    .from(l113Batches)
    .where(gte(l113Batches.endDate, cutoff.toISOString().slice(0, 10)))
    .orderBy(desc(l113Batches.startDate), desc(l113Batches.id));
  if (batches.length === 0) batches = (await getL113Batches()).slice(0, 1);
  if (batches.length === 0) return { batches, students: [] };

  const rows = await db
    .select({
      batchId: l113BatchStudents.batchId,
      vgLeaderId: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      nickname: victoryGroupLeaders.nickname,
    })
    .from(l113BatchStudents)
    .innerJoin(victoryGroupLeaders, eq(victoryGroupLeaders.id, l113BatchStudents.vgLeaderId))
    .where(inArray(l113BatchStudents.batchId, batches.map((b) => b.id)))
    .orderBy(asc(victoryGroupLeaders.lastName), asc(victoryGroupLeaders.firstName));
  return {
    batches,
    students: rows.map((r) => ({
      key: l113StudentKey(r.batchId, r.vgLeaderId),
      batchId: r.batchId,
      vgLeaderId: r.vgLeaderId,
      label: `${r.lastName}, ${r.firstName}${r.nickname ? ` (${r.nickname})` : ""}`,
    })),
  };
}

/** Is this VG leader a student of this batch? */
export async function isBatchStudent(batchId: number, vgLeaderId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: l113BatchStudents.id })
    .from(l113BatchStudents)
    .where(and(eq(l113BatchStudents.batchId, batchId), eq(l113BatchStudents.vgLeaderId, vgLeaderId)))
    .limit(1);
  return !!row;
}

export interface L113FormTopic {
  id: number;
  topic: string;
  teacher: string;
}

/**
 * Topics of the form batches that have started (a class date on or before today), by batch,
 * plus which batch each of the batches' topics belongs to.
 */
export async function getL113FormTopics(batches: L113Batch[]) {
  const today = todayPH();
  const schedules = await Promise.all(batches.map((b) => getBatchSchedule(b.id)));
  const topicsByBatch: Record<number, L113FormTopic[]> = {};
  const batchOfTopic = new Map<number, number>();
  batches.forEach((b, i) => {
    topicsByBatch[b.id] = schedules[i]
      .filter((s) => s.dates.some((d) => d.classDate <= today))
      .map((s) => ({ id: s.id, topic: s.topic, teacher: s.teacher }));
    for (const s of schedules[i]) batchOfTopic.set(s.id, b.id);
  });
  return { topicsByBatch, batchOfTopic };
}

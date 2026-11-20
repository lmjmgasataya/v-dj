import { db } from "@/db";
import {
  l113Batches,
  l113CheckIns,
  l113Schedules,
  l113SpiritualDisciplines,
  l113StudentEvaluations,
  l113TeacherEvaluations,
  l113Teachers,
  l113Topics,
  victoryGroupLeaders,
} from "@/db/schema";
import type { CheckInStatus, L113Batch } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { todayPH } from "@/lib/date";
import { batchMonths } from "@/lib/l113";
import { getBatchSchedule, getBatchStudents, type L113ScheduleWithDates, type L113Student } from "@/lib/l113Data";

/** Graduation readiness thresholds (L113 Reports). */
export const L113_MIN_ATTENDANCE_PCT = 80;
export const L113_MIN_SCORE_PCT = 75;
/** Absences at or above this are flagged on the attendance summary. */
export const L113_ABSENCE_FLAG = 3;

/** A student's status for one class date; null = not held yet (or today, no check-in yet). */
export type L113DateStatus = CheckInStatus | null;

export interface L113StudentProgress {
  student: L113Student;
  onTime: number;
  late: number;
  absent: number;
  /** Class dates counted so far (past dates, plus today's if they checked in). */
  held: number;
  /** (On Time + Late) / held, 0–100; null when nothing has been held. */
  attendancePct: number | null;
  scoreTotal: number;
  scoreMax: number;
  scoredTopics: number;
  scorePct: number | null;
  semesterScorePct: Record<1 | 2, number | null>;
  /** Spiritual Disciplines: months submitted out of the batch months that have ended. */
  sdSubmitted: number;
  sdDue: number;
  /** null = nothing to judge yet. */
  checks: { attendance: boolean | null; score: boolean | null; disciplines: boolean | null };
  ready: boolean;
}

export interface L113BatchProgress {
  schedule: L113ScheduleWithDates[];
  /** Ended batch months (before the current month), oldest first. */
  dueMonths: string[];
  students: L113StudentProgress[];
  statusOf: (scheduleDateId: number, classDate: string, vgLeaderId: number) => L113DateStatus;
  checkInTime: (scheduleDateId: number, vgLeaderId: number) => Date | null;
  scoreOf: (scheduleId: number, vgLeaderId: number) => { score: number; highest: number } | null;
  disciplinesOf: (vgLeaderId: number) => (typeof l113SpiritualDisciplines.$inferSelect)[];
}

function pct(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : null;
}

/** Everything the batch reports need, computed once per batch. */
export async function getBatchProgress(batch: L113Batch): Promise<L113BatchProgress> {
  const [schedule, students] = await Promise.all([getBatchSchedule(batch.id), getBatchStudents(batch.id)]);
  const dateIds = schedule.flatMap((s) => s.dates.map((d) => d.id));
  const scheduleIds = schedule.map((s) => s.id);
  const [checkIns, scores, disciplines] = await Promise.all([
    dateIds.length ? db.select().from(l113CheckIns).where(inArray(l113CheckIns.scheduleDateId, dateIds)) : [],
    scheduleIds.length ? db.select().from(l113StudentEvaluations).where(inArray(l113StudentEvaluations.scheduleId, scheduleIds)) : [],
    db.select().from(l113SpiritualDisciplines).where(eq(l113SpiritualDisciplines.batchId, batch.id)),
  ]);

  const today = todayPH();
  const checkInByKey = new Map(checkIns.map((c) => [`${c.scheduleDateId}:${c.vgLeaderId}`, c]));
  const scoreByKey = new Map(scores.map((e) => [`${e.scheduleId}:${e.vgLeaderId}`, e]));
  const semesterOf = new Map(schedule.map((s) => [s.id, s.semester]));
  const dueMonths = batchMonths(batch.startDate, batch.endDate).filter((m) => m < today.slice(0, 7));

  const statusOf = (scheduleDateId: number, classDate: string, vgLeaderId: number): L113DateStatus =>
    checkInByKey.get(`${scheduleDateId}:${vgLeaderId}`)?.status ?? (classDate < today ? "Absent" : null);

  const progress = students.map((student): L113StudentProgress => {
    const counts = { "On-time": 0, Late: 0, Absent: 0 };
    for (const s of schedule) {
      for (const d of s.dates) {
        const status = statusOf(d.id, d.classDate, student.vgLeaderId);
        if (status) counts[status]++;
      }
    }
    const held = counts["On-time"] + counts.Late + counts.Absent;
    const attendancePct = pct(counts["On-time"] + counts.Late, held);

    const mine = scores.filter((e) => e.vgLeaderId === student.vgLeaderId);
    const scoreTotal = mine.reduce((n, e) => n + e.score, 0);
    const scoreMax = mine.reduce((n, e) => n + e.highestPossibleScore, 0);
    const semesterScorePct = { 1: null, 2: null } as Record<1 | 2, number | null>;
    for (const sem of [1, 2] as const) {
      const inSem = mine.filter((e) => semesterOf.get(e.scheduleId) === sem);
      semesterScorePct[sem] = pct(
        inSem.reduce((n, e) => n + e.score, 0),
        inSem.reduce((n, e) => n + e.highestPossibleScore, 0)
      );
    }
    const scorePct = pct(scoreTotal, scoreMax);

    const submittedMonths = new Set(disciplines.filter((d) => d.vgLeaderId === student.vgLeaderId).map((d) => d.month));
    const sdSubmitted = dueMonths.filter((m) => submittedMonths.has(m)).length;

    const checks = {
      attendance: attendancePct == null ? null : attendancePct >= L113_MIN_ATTENDANCE_PCT,
      score: scorePct == null ? null : scorePct >= L113_MIN_SCORE_PCT,
      disciplines: dueMonths.length === 0 ? null : sdSubmitted === dueMonths.length,
    };
    const judged = Object.values(checks).filter((c) => c != null);
    return {
      student,
      onTime: counts["On-time"],
      late: counts.Late,
      absent: counts.Absent,
      held,
      attendancePct,
      scoreTotal,
      scoreMax,
      scoredTopics: mine.length,
      scorePct,
      semesterScorePct,
      sdSubmitted,
      sdDue: dueMonths.length,
      checks,
      ready: judged.length > 0 && judged.every(Boolean),
    };
  });

  return {
    schedule,
    dueMonths,
    students: progress,
    statusOf,
    checkInTime: (scheduleDateId, vgLeaderId) => checkInByKey.get(`${scheduleDateId}:${vgLeaderId}`)?.checkedInAt ?? null,
    scoreOf: (scheduleId, vgLeaderId) => {
      const e = scoreByKey.get(`${scheduleId}:${vgLeaderId}`);
      return e ? { score: e.score, highest: e.highestPossibleScore } : null;
    },
    disciplinesOf: (vgLeaderId) => disciplines.filter((d) => d.vgLeaderId === vgLeaderId).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export function formatPct(value: number | null): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}

/** Teacher evaluations with their topic, batch and the teacher rated, optionally for one batch. */
export async function getTeacherEvaluationRows(batchId?: number) {
  return db
    .select({
      id: l113TeacherEvaluations.id,
      teacherId: l113Teachers.id,
      teacher: l113Teachers.name,
      scheduleId: l113Schedules.id,
      topic: l113Topics.name,
      batchId: l113Batches.id,
      batch: l113Batches.name,
      batchStart: l113Batches.startDate,
      student: victoryGroupLeaders.firstName,
      studentLast: victoryGroupLeaders.lastName,
      preparedRating: l113TeacherEvaluations.preparedRating,
      clarityRating: l113TeacherEvaluations.clarityRating,
      responsivenessRating: l113TeacherEvaluations.responsivenessRating,
      liked: l113TeacherEvaluations.liked,
      improvement: l113TeacherEvaluations.improvement,
    })
    .from(l113TeacherEvaluations)
    .innerJoin(l113Teachers, eq(l113Teachers.id, l113TeacherEvaluations.teacherId))
    .innerJoin(l113Schedules, eq(l113Schedules.id, l113TeacherEvaluations.scheduleId))
    .innerJoin(l113Topics, eq(l113Topics.id, l113Schedules.topicId))
    .innerJoin(l113Batches, eq(l113Batches.id, l113Schedules.batchId))
    .innerJoin(victoryGroupLeaders, eq(victoryGroupLeaders.id, l113TeacherEvaluations.vgLeaderId))
    .where(batchId ? eq(l113Schedules.batchId, batchId) : undefined)
    .orderBy(asc(l113Teachers.name));
}

export type TeacherEvaluationRow = Awaited<ReturnType<typeof getTeacherEvaluationRows>>[number];

/** Average of each rated statement, and of all three. */
export function averageRatings(rows: TeacherEvaluationRow[]) {
  const avg = (key: "preparedRating" | "clarityRating" | "responsivenessRating") =>
    rows.length ? rows.reduce((n, r) => n + r[key], 0) / rows.length : null;
  const per = { preparedRating: avg("preparedRating"), clarityRating: avg("clarityRating"), responsivenessRating: avg("responsivenessRating") };
  const vals = Object.values(per).filter((v): v is number => v != null);
  return { ...per, overall: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
}

export function formatRating(value: number | null): string {
  return value == null ? "—" : value.toFixed(2);
}

import { after } from "next/server";
import { db } from "@/db";
import { autoJourneySteps, batches, checkIns, classSessions, participants, sessionVglCheckIns, victoryGroupLeaders } from "@/db/schema";
import { and, desc, eq, inArray, isNotNull, isNull, like, ne, sql } from "drizzle-orm";
import { areSimilarNames, createLeaderMatcher } from "@/lib/vgLeaderMatch";
import { AUTO_JOURNEY_STEPS } from "@/components/form";

const [SPIRITUAL_FOUNDATIONS, EMPOWERING_LEADERS] = AUTO_JOURNEY_STEPS;

/**
 * The value to save when a VG leader submits their own profile: the steps they checked, minus
 * the automatic ones, plus whichever automatic ones were already on record. Done in SQL so a
 * sync landing at the same moment isn't lost.
 */
export function ownJourneyStepsSql(submitted: string[]) {
  const own = submitted.filter((s) => !AUTO_JOURNEY_STEPS.includes(s)).join(",") || null;
  const col = victoryGroupLeaders.discipleshipJourneyCompleted;
  const autoSteps = sql`array[${sql.join(AUTO_JOURNEY_STEPS.map((s) => sql`${s}::text`), sql`, `)}]`;
  return sql<string | null>`nullif(concat_ws(',', ${own}::text, (select string_agg(s, ',') from unnest(string_to_array(coalesce(${col}, ''), ',')) as s where s = any(${autoSteps}))), '')`;
}

type JourneyLink = { vgLeaderId: number; participantId?: number; classSessionId?: number };

/**
 * Participants who attended every Spiritual Foundations session of their batch — the same rule
 * as "Attended all" on the batch attendance report (fee categories C/D skip the Victory Day ones),
 * matched to a VG leader by mobile number, then by name — and the names have to agree either way.
 */
async function spiritualFoundationsLinks(): Promise<JourneyLink[]> {
  const sessions = await db
    .select({ id: classSessions.id, batchId: classSessions.batchId, isVictoryDay: classSessions.isVictoryDay })
    .from(classSessions)
    .where(and(like(classSessions.name, `${SPIRITUAL_FOUNDATIONS}%`), isNotNull(classSessions.batchId)));
  if (sessions.length === 0) return [];

  const batchIds = [...new Set(sessions.map((s) => s.batchId!))];
  const [registrants, attended, leaders] = await Promise.all([
    db
      .select({
        id: participants.id,
        lastName: participants.lastName,
        firstName: participants.firstName,
        mobileNumber: participants.mobileNumber,
        batchId: participants.batchId,
        registrationFee: participants.registrationFee,
      })
      .from(participants)
      .where(and(isNull(participants.deletedAt), eq(participants.isWalkIn, false), inArray(participants.batchId, batchIds)))
      .orderBy(participants.id),
    db
      .select({ participantId: checkIns.participantId, classSessionId: checkIns.classSessionId })
      .from(checkIns)
      .where(and(inArray(checkIns.classSessionId, sessions.map((s) => s.id)), ne(checkIns.status, "Absent"))),
    db
      .select({
        id: victoryGroupLeaders.id,
        lastName: victoryGroupLeaders.lastName,
        firstName: victoryGroupLeaders.firstName,
        mobileNumber: victoryGroupLeaders.mobileNumber,
      })
      .from(victoryGroupLeaders)
      .where(isNull(victoryGroupLeaders.deletedAt)),
  ]);

  const present = new Set(attended.map((c) => `${c.participantId}|${c.classSessionId}`));
  const match = createLeaderMatcher(leaders);
  // First (oldest) participant record per leader, if they somehow finished in more than one batch.
  const links = new Map<number, JourneyLink>();
  for (const p of registrants) {
    const skipsVictoryDay = p.registrationFee === "C" || p.registrationFee === "D";
    const required = sessions.filter((s) => s.batchId === p.batchId && !(skipsVictoryDay && s.isVictoryDay));
    if (required.length === 0 || !required.every((s) => present.has(`${p.id}|${s.id}`))) continue;
    const found = match(p);
    // A shared family phone matches the wrong person by mobile alone — the name must agree too.
    if (found && areSimilarNames(found.leader, p) && !links.has(found.leader.id)) {
      links.set(found.leader.id, { vgLeaderId: found.leader.id, participantId: p.id });
    }
  }
  return [...links.values()];
}

/** VG leaders checked in (On-time or Late) to an Empowering Leaders VGL-only session — their earliest one. */
async function empoweringLeadersLinks(): Promise<JourneyLink[]> {
  const rows = await db
    .select({ vgLeaderId: sessionVglCheckIns.vgLeaderId, classSessionId: sessionVglCheckIns.classSessionId })
    .from(sessionVglCheckIns)
    .innerJoin(classSessions, eq(sessionVglCheckIns.classSessionId, classSessions.id))
    .where(and(like(classSessions.name, `${EMPOWERING_LEADERS}%`), ne(sessionVglCheckIns.status, "Absent")))
    .orderBy(classSessions.sessionDate, classSessions.id);
  const links = new Map<number, JourneyLink>();
  for (const r of rows) if (!links.has(r.vgLeaderId)) links.set(r.vgLeaderId, r);
  return [...links.values()];
}

/**
 * Appends `step` to each leader's completed steps in one statement, so it can't clobber a profile
 * saved at the same moment. Leaves updatedAt alone — this isn't the leader updating their profile.
 */
async function addJourneyStep(step: string, leaderIds: number[]): Promise<number> {
  if (leaderIds.length === 0) return 0;
  const col = victoryGroupLeaders.discipleshipJourneyCompleted;
  const updated = await db
    .update(victoryGroupLeaders)
    .set({ discipleshipJourneyCompleted: sql`concat_ws(',', nullif(${col}, ''), ${step}::text)` })
    .where(
      and(
        inArray(victoryGroupLeaders.id, leaderIds),
        isNull(victoryGroupLeaders.deletedAt),
        sql`not (${step}::text = any(string_to_array(coalesce(${col}, ''), ',')))`
      )
    )
    .returning({ id: victoryGroupLeaders.id });
  return updated.length;
}

/**
 * Records the links not seen before, then adds `step` for just those leaders. A link is only ever
 * acted on once, so a developer unchecking the step afterwards isn't undone by the next sync.
 */
async function recordAndAddJourneyStep(step: string, links: JourneyLink[]): Promise<number> {
  if (links.length === 0) return 0;
  const leaderIds = links.map((l) => l.vgLeaderId);
  const [known, leaders] = await Promise.all([
    db
      .select({ vgLeaderId: autoJourneySteps.vgLeaderId })
      .from(autoJourneySteps)
      .where(and(eq(autoJourneySteps.step, step), inArray(autoJourneySteps.vgLeaderId, leaderIds))),
    db
      .select({ id: victoryGroupLeaders.id, steps: victoryGroupLeaders.discipleshipJourneyCompleted })
      .from(victoryGroupLeaders)
      .where(and(inArray(victoryGroupLeaders.id, leaderIds), isNull(victoryGroupLeaders.deletedAt))),
  ]);
  const knownIds = new Set(known.map((k) => k.vgLeaderId));
  const stepsById = new Map(leaders.map((l) => [l.id, (l.steps ?? "").split(",")]));
  const fresh = links.filter((l) => !knownIds.has(l.vgLeaderId) && stepsById.has(l.vgLeaderId));
  if (fresh.length === 0) return 0;

  // Two syncs racing both insert; onConflictDoNothing lets only one of them claim each link.
  const inserted = await db
    .insert(autoJourneySteps)
    .values(
      fresh.map((l) => ({
        vgLeaderId: l.vgLeaderId,
        step,
        participantId: l.participantId ?? null,
        classSessionId: l.classSessionId ?? null,
        wasAlreadyChecked: stepsById.get(l.vgLeaderId)!.includes(step),
      }))
    )
    .onConflictDoNothing()
    .returning({ vgLeaderId: autoJourneySteps.vgLeaderId });
  return addJourneyStep(step, inserted.map((r) => r.vgLeaderId));
}

/**
 * Marks Spiritual Foundations and Empowering Leaders done on the VG leaders who completed them in
 * the Discipleship Journey Portal, and records where each came from (autoJourneySteps). Only ever
 * adds a step, never removes one — leaders who took a class before the portal existed keep what
 * they checked. Returns how many leaders gained each step.
 */
export async function syncJourneyStepsFromDjPortal(): Promise<{ spiritualFoundations: number; empoweringLeaders: number }> {
  const [sfLinks, elLinks] = await Promise.all([spiritualFoundationsLinks(), empoweringLeadersLinks()]);
  const [spiritualFoundations, empoweringLeaders] = await Promise.all([
    recordAndAddJourneyStep(SPIRITUAL_FOUNDATIONS, sfLinks),
    recordAndAddJourneyStep(EMPOWERING_LEADERS, elLinks),
  ]);
  return { spiritualFoundations, empoweringLeaders };
}

export interface AutoJourneyLink {
  vgLeaderId: number;
  leaderName: string;
  service: string | null;
  step: string;
  /** "Batch Jul-Oct 2026, as participant Delicana, Kristine Joyce" / "Empowering Leaders, Oct 24, 2026". */
  source: string;
  wasAlreadyChecked: boolean;
  linkedAt: Date;
}

/** The recorded DJ Portal links, newest first — for every leader, or just `vgLeaderIds`. */
export async function getAutoJourneyLinks(opts: { vgLeaderIds?: number[]; serviceRawValues?: string[] } = {}): Promise<AutoJourneyLink[]> {
  const rows = await db
    .select({
      vgLeaderId: autoJourneySteps.vgLeaderId,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      service: victoryGroupLeaders.serviceAttending,
      step: autoJourneySteps.step,
      wasAlreadyChecked: autoJourneySteps.wasAlreadyChecked,
      linkedAt: autoJourneySteps.createdAt,
      participantLastName: participants.lastName,
      participantFirstName: participants.firstName,
      batchName: batches.name,
      sessionName: classSessions.name,
      sessionDate: classSessions.sessionDate,
    })
    .from(autoJourneySteps)
    .innerJoin(victoryGroupLeaders, eq(autoJourneySteps.vgLeaderId, victoryGroupLeaders.id))
    .leftJoin(participants, eq(autoJourneySteps.participantId, participants.id))
    .leftJoin(batches, eq(participants.batchId, batches.id))
    .leftJoin(classSessions, eq(autoJourneySteps.classSessionId, classSessions.id))
    .where(
      and(
        isNull(victoryGroupLeaders.deletedAt),
        opts.vgLeaderIds ? inArray(autoJourneySteps.vgLeaderId, opts.vgLeaderIds) : undefined,
        opts.serviceRawValues ? inArray(victoryGroupLeaders.serviceAttending, opts.serviceRawValues) : undefined
      )
    )
    .orderBy(desc(autoJourneySteps.createdAt), victoryGroupLeaders.lastName);

  return rows.map((r) => {
    let source = "Discipleship Journey Portal";
    if (r.participantLastName) {
      source = `${r.batchName ? `Batch ${r.batchName}, ` : ""}as participant ${r.participantLastName}, ${r.participantFirstName}`;
    } else if (r.sessionName && r.sessionDate) {
      const date = new Date(r.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
      });
      source = `${r.sessionName}, ${date}`;
    }
    return {
      vgLeaderId: r.vgLeaderId,
      leaderName: `${r.lastName}, ${r.firstName}`,
      service: r.service,
      step: r.step,
      source,
      wasAlreadyChecked: r.wasAlreadyChecked,
      linkedAt: r.linkedAt,
    };
  });
}

/** Runs the sync after the check-in response is sent, so it never slows check-in down. */
export function syncJourneyStepsAfterResponse() {
  after(() =>
    syncJourneyStepsFromDjPortal().catch((err) => console.error("Discipleship Journey step sync failed:", err))
  );
}

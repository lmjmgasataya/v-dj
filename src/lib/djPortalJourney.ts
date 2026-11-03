import { after } from "next/server";
import { db } from "@/db";
import { autoJourneySteps, batches, checkIns, classSessions, participants, sessionVglCheckIns, victoryGroupLeaders } from "@/db/schema";
import { and, desc, eq, inArray, isNull, like, ne, notInArray, sql } from "drizzle-orm";
import { areSimilarNames, createLeaderMatcher, normalizeName } from "@/lib/vgLeaderMatch";
import { AUTO_JOURNEY_STEPS, VICTORY_DAY_STEP } from "@/components/form";
import { todayPH } from "@/lib/date";

const [SPIRITUAL_FOUNDATIONS, MAKING_DISCIPLES, EMPOWERING_LEADERS] = AUTO_JOURNEY_STEPS;

/** Classes repeat every batch under the same names; compare them ignoring case and spacing. */
function classKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The value to save when a profile form is submitted: the steps checked, minus the `locked` ones,
 * plus whichever locked ones were already on record. A VG leader's own profile locks every
 * automatic step; the developer edit page locks only DJ_PORTAL_ONLY_STEPS. Done in SQL so a sync
 * landing at the same moment isn't lost.
 */
export function ownJourneyStepsSql(submitted: string[], locked: readonly string[] = AUTO_JOURNEY_STEPS) {
  const own = submitted.filter((s) => !locked.includes(s)).join(",") || null;
  const col = victoryGroupLeaders.discipleshipJourneyCompleted;
  const lockedSteps = sql`array[${sql.join(locked.map((s) => sql`${s}::text`), sql`, `)}]`;
  return sql<string | null>`nullif(concat_ws(',', ${own}::text, (select string_agg(s, ',') from unnest(string_to_array(coalesce(${col}, ''), ',')) as s where s = any(${lockedSteps}))), '')`;
}

type JourneyLink = { vgLeaderId: number; participantId?: number; classSessionId?: number };

type ClassAttendance = {
  vgLeaderId: number;
  /** The record they last attended under (their newest one if they never came) — the link's source. */
  participantId: number;
  /** The classes they need, each with whether they attended it — on any of their records, in any batch. */
  required: { name: string; sessionDate: string; attended: boolean }[];
};

/**
 * Each VG leader's attendance at the classes whose name starts with `step` — only the Victory Day
 * ones when `victoryDay` is set, otherwise all but those. So Spiritual Foundations Day 1 (the
 * Victory Day sessions) is the Victory Day step and Day 2 to Day 10 are Spiritual Foundations,
 * whatever the fee category. Participant records are matched to a leader by mobile number, then by
 * name — and the names have to agree either way. A leader's records are combined: a class counts
 * once attended in any batch, whether made up under the same record or under a new registration
 * in a later batch. One entry per leader matched to at least one record.
 */
async function batchClassAttendance(step: string, { victoryDay = false } = {}): Promise<ClassAttendance[]> {
  const allSessions = await db
    .select({
      id: classSessions.id,
      name: classSessions.name,
      sessionDate: classSessions.sessionDate,
      batchId: classSessions.batchId,
      isVictoryDay: classSessions.isVictoryDay,
    })
    .from(classSessions)
    .where(like(classSessions.name, `${step}%`));
  const sessions = allSessions.filter((s) => s.batchId != null);
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
      })
      .from(participants)
      .where(and(isNull(participants.deletedAt), eq(participants.isWalkIn, false), inArray(participants.batchId, batchIds)))
      .orderBy(participants.id),
    db
      .select({ participantId: checkIns.participantId, classSessionId: checkIns.classSessionId })
      .from(checkIns)
      .where(and(inArray(checkIns.classSessionId, allSessions.map((s) => s.id)), ne(checkIns.status, "Absent"))),
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

  const sessionById = new Map(allSessions.map((s) => [s.id, s]));
  // Classes each participant record attended (any batch's session), and when they last came.
  const attendedClasses = new Map<number, Set<string>>();
  const lastAttended = new Map<number, string>();
  for (const c of attended) {
    const session = sessionById.get(c.classSessionId)!;
    attendedClasses.set(c.participantId, (attendedClasses.get(c.participantId) ?? new Set()).add(classKey(session.name)));
    if (session.sessionDate > (lastAttended.get(c.participantId) ?? "")) lastAttended.set(c.participantId, session.sessionDate);
  }

  const match = createLeaderMatcher(leaders);
  type Combined = { participantId: number; lastAttended: string; classes: Map<string, { name: string; sessionDate: string; attended: boolean }> };
  const byLeader = new Map<number, Combined>();
  // Oldest record first, so a later batch's session dates replace an earlier one's.
  for (const p of registrants) {
    const required = sessions.filter((s) => s.batchId === p.batchId && s.isVictoryDay === victoryDay);
    if (required.length === 0) continue;
    const found = match(p);
    // A shared family phone matches the wrong person by mobile alone — the name must agree too.
    if (!found || !areSimilarNames(found.leader, p)) continue;

    const entry = byLeader.get(found.leader.id) ?? { participantId: p.id, lastAttended: "", classes: new Map() };
    const came = lastAttended.get(p.id) ?? "";
    if (came >= entry.lastAttended) Object.assign(entry, { participantId: p.id, lastAttended: came });
    const mine = attendedClasses.get(p.id);
    for (const s of required) {
      const key = classKey(s.name);
      const wasAttended = entry.classes.get(key)?.attended ?? false;
      entry.classes.set(key, { name: s.name, sessionDate: s.sessionDate, attended: wasAttended || !!mine?.has(key) });
    }
    byLeader.set(found.leader.id, entry);
  }

  return [...byLeader].map(([vgLeaderId, e]) => ({
    vgLeaderId,
    participantId: e.participantId,
    required: [...e.classes.values()],
  }));
}

/** Leaders who attended every required class — see batchClassAttendance. */
async function batchClassLinks(step: string, opts: { victoryDay?: boolean } = {}): Promise<JourneyLink[]> {
  return (await batchClassAttendance(step, opts))
    .filter((a) => a.required.every((s) => s.attended))
    .map((a) => ({ vgLeaderId: a.vgLeaderId, participantId: a.participantId }));
}

export interface SpiritualFoundationsProgress {
  attended: number;
  total: number;
  /** e.g. "Attended 6 of 9 sessions (Day 2 to Day 10). Missed: Day 4, Day 7. Coming up: Day 10." */
  note: string;
}

/**
 * For each leader who attended some of Spiritual Foundations Day 2 to Day 10 but not all, how far
 * they got across all their participant records and batches, keyed by VG leader id. Leaders who finished it, never came, or aren't matched to a
 * participant record aren't in the map.
 */
export async function getSpiritualFoundationsProgress(): Promise<Map<number, SpiritualFoundationsProgress>> {
  const today = todayPH();
  const label = (name: string) => name.slice(SPIRITUAL_FOUNDATIONS.length).trim() || name;
  const result = new Map<number, SpiritualFoundationsProgress>();
  for (const { vgLeaderId, required } of await batchClassAttendance(SPIRITUAL_FOUNDATIONS)) {
    const attended = required.filter((s) => s.attended).length;
    if (attended === 0 || attended === required.length) continue;

    const notAttended = required.filter((s) => !s.attended);
    const missed = notAttended.filter((s) => s.sessionDate <= today).map((s) => label(s.name));
    const upcoming = notAttended.filter((s) => s.sessionDate > today).map((s) => label(s.name));
    const note = [
      `Attended ${attended} of ${required.length} sessions (Day 2 to Day 10).`,
      missed.length > 0 && `Missed: ${missed.join(", ")}.`,
      upcoming.length > 0 && `Coming up: ${upcoming.join(", ")}.`,
    ]
      .filter(Boolean)
      .join(" ");
    result.set(vgLeaderId, { attended, total: required.length, note });
  }
  return result;
}

/** One leader's getSpiritualFoundationsProgress note, or null. */
export async function getSpiritualFoundationsProgressNote(vgLeaderId: number): Promise<string | null> {
  return (await getSpiritualFoundationsProgress()).get(vgLeaderId)?.note ?? null;
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
 * Takes `step` off every leader not in `keepLeaderIds` (non-empty), in one statement like addJourneyStep.
 * Leaves updatedAt alone.
 */
async function removeJourneyStep(step: string, keepLeaderIds: number[]): Promise<number> {
  const col = victoryGroupLeaders.discipleshipJourneyCompleted;
  const updated = await db
    .update(victoryGroupLeaders)
    .set({ discipleshipJourneyCompleted: sql`nullif(array_to_string(array_remove(string_to_array(${col}, ','), ${step}::text), ','), '')` })
    .where(
      and(
        isNull(victoryGroupLeaders.deletedAt),
        notInArray(victoryGroupLeaders.id, keepLeaderIds),
        sql`${step}::text = any(string_to_array(coalesce(${col}, ''), ','))`
      )
    )
    .returning({ id: victoryGroupLeaders.id });
  return updated.length;
}

/**
 * A DJ_PORTAL_ONLY_STEPS step: checked for exactly the leaders the DJ Portal links today, whatever
 * was answered by hand. Records new links, drops recorded links that no longer hold (e.g. the
 * participant record was deleted), adds the step for every linked leader — even one a developer
 * unchecked — and removes it from everyone else. Returns how many leaders gained and lost it.
 */
async function overrideJourneyStep(step: string, links: JourneyLink[]): Promise<{ added: number; removed: number }> {
  // No links at all means no matching sessions (renamed classes?), not that nobody finished —
  // don't wipe the step from every leader over it.
  if (links.length === 0) return { added: 0, removed: 0 };
  const leaderIds = links.map((l) => l.vgLeaderId);
  const newlyLinked = await recordAndAddJourneyStep(step, links);
  const [, removed] = await Promise.all([
    db
      .delete(autoJourneySteps)
      .where(and(eq(autoJourneySteps.step, step), notInArray(autoJourneySteps.vgLeaderId, leaderIds))),
    removeJourneyStep(step, leaderIds),
  ]);
  return { added: newlyLinked + (await addJourneyStep(step, leaderIds)), removed };
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
 * Marks Victory Day, Spiritual Foundations, Making Disciples and Empowering Leaders done on the VG
 * leaders who completed them in the Discipleship Journey Portal, and records where each came from
 * (autoJourneySteps). Victory Day, Making Disciples and Empowering Leaders are only ever added,
 * never removed — a manual check (e.g. from before the portal existed) stays. Spiritual
 * Foundations (DJ_PORTAL_ONLY_STEPS) follows the portal exactly: it's also removed from leaders the
 * portal doesn't link. Returns how many leaders gained each step (and lost Spiritual Foundations).
 */
export async function syncJourneyStepsFromDjPortal(): Promise<{
  victoryDay: number;
  spiritualFoundations: number;
  spiritualFoundationsRemoved: number;
  makingDisciples: number;
  empoweringLeaders: number;
}> {
  const [vdLinks, sfLinks, mdLinks, elLinks] = await Promise.all([
    batchClassLinks(SPIRITUAL_FOUNDATIONS, { victoryDay: true }),
    batchClassLinks(SPIRITUAL_FOUNDATIONS),
    batchClassLinks(MAKING_DISCIPLES),
    empoweringLeadersLinks(),
  ]);
  const [victoryDay, sf, makingDisciples, empoweringLeaders] = await Promise.all([
    recordAndAddJourneyStep(VICTORY_DAY_STEP, vdLinks),
    overrideJourneyStep(SPIRITUAL_FOUNDATIONS, sfLinks),
    recordAndAddJourneyStep(MAKING_DISCIPLES, mdLinks),
    recordAndAddJourneyStep(EMPOWERING_LEADERS, elLinks),
  ]);
  return {
    victoryDay,
    spiritualFoundations: sf.added,
    spiritualFoundationsRemoved: sf.removed,
    makingDisciples,
    empoweringLeaders,
  };
}

export interface AutoJourneyLink {
  vgLeaderId: number;
  leaderName: string;
  service: string | null;
  step: string;
  /** Short: "Jul-Oct 2026 batch" (Spiritual Foundations, Making Disciples) / "Oct 24, 2026 session" (Empowering Leaders). */
  source: string;
  /** The participant record's name — only when it's spelled differently from the leader's. */
  participantName: string | null;
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
    let participantName: string | null = null;
    if (r.participantLastName != null && r.participantFirstName != null) {
      if (r.batchName) source = `${r.batchName} batch`;
      const sameName =
        normalizeName(r.participantLastName) === normalizeName(r.lastName) &&
        normalizeName(r.participantFirstName) === normalizeName(r.firstName);
      if (!sameName) participantName = `${r.participantLastName}, ${r.participantFirstName}`;
    } else if (r.sessionDate) {
      const date = new Date(r.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
      });
      source = `${date} session`;
    }
    return {
      vgLeaderId: r.vgLeaderId,
      leaderName: `${r.lastName}, ${r.firstName}`,
      service: r.service,
      step: r.step,
      source,
      participantName,
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

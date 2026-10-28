import { db } from "@/db";
import { batches, checkIns, classSessions, participants } from "@/db/schema";
import { and, count, eq, exists, inArray, isNotNull, lt, ne, notExists, or, sql, type SQL } from "drizzle-orm";

export type SessionBatchScope = {
  id: number;
  name: string;
  batchId: number | null;
  /** The session batch's classStartDate — "earlier batch" means one that started before it. */
  batchStart: string | null;
};

export async function getSessionBatchScope(sessionId: number): Promise<SessionBatchScope | null> {
  const [row] = await db
    .select({ id: classSessions.id, name: classSessions.name, batchId: classSessions.batchId, batchStart: batches.classStartDate })
    .from(classSessions)
    .leftJoin(batches, eq(classSessions.batchId, batches.id))
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  return row ?? null;
}

/**
 * Who can check in to a session: its own batch's registrants, plus registrants of earlier
 * batches who haven't attended a class of the same name yet (a make-up class) — the same
 * classes repeat every batch. Anyone already checked in to it stays in. Sessions without a
 * batch are open to everyone (undefined = no condition).
 */
export function eligibleForSession(session: SessionBatchScope): SQL | undefined {
  if (session.batchId == null || session.batchStart == null) return undefined;

  const earlierBatchIds = db.select({ id: batches.id }).from(batches).where(lt(batches.classStartDate, session.batchStart));
  const checkedInHere = db
    .select({ one: sql`1` })
    .from(checkIns)
    .where(and(eq(checkIns.participantId, participants.id), eq(checkIns.classSessionId, session.id)));

  return or(
    eq(participants.batchId, session.batchId),
    exists(checkedInHere),
    and(inArray(participants.batchId, earlierBatchIds), notExists(attendedSameClass(session))),
  );
}

/** A non-Absent check-in to another session with the same class name (case/space-insensitive). */
function attendedSameClass(session: SessionBatchScope) {
  return db
    .select({ one: sql`1` })
    .from(checkIns)
    .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
    .where(
      and(
        eq(checkIns.participantId, participants.id),
        ne(checkIns.status, "Absent"),
        ne(classSessions.id, session.id),
        sql`lower(trim(${classSessions.name})) = lower(trim(${session.name}))`,
      ),
    );
}

/** Why a participant outside `eligibleForSession` can't check in, or null when they can. */
export async function getBatchBlockReason(participantId: number, session: SessionBatchScope): Promise<string | null> {
  const condition = eligibleForSession(session);
  if (!condition) return null;

  const [row] = await db
    .select({ batchId: participants.batchId, batchName: batches.name, batchStart: batches.classStartDate, eligible: sql<boolean>`${condition}` })
    .from(participants)
    .leftJoin(batches, eq(participants.batchId, batches.id))
    .where(eq(participants.id, participantId))
    .limit(1);

  if (!row || row.eligible) return null;
  if (row.batchStart != null && row.batchStart < session.batchStart!) return "Already attended this class";
  return `Not registered for this batch (${row.batchName ?? "no batch"})`;
}

/** Number of Victory Day sessions in each batch — what that batch's participants must attend. */
export async function getVictoryDayTotalsByBatch(): Promise<Map<number, number>> {
  const rows = await db
    .select({ batchId: classSessions.batchId, total: count() })
    .from(classSessions)
    .where(and(eq(classSessions.isVictoryDay, true), isNotNull(classSessions.batchId)))
    .groupBy(classSessions.batchId);
  return new Map(rows.map((r) => [r.batchId!, r.total]));
}

export function victoryDayTotalFor(totals: Map<number, number>, batchId: number | null): number {
  return batchId == null ? 0 : (totals.get(batchId) ?? 0);
}

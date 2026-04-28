import { db } from "@/db";
import { classSessions, checkIns, participants } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import Link from "next/link";
import { WalkInForm } from "./WalkInForm";
import { ParticipantSearch } from "./ParticipantSearch";
import { SessionSelect } from "./SessionSelect";
import { SessionAttendeesModal } from "./SessionAttendeesModal";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const sessionId = session ? parseInt(session, 10) : null;

  const sessions = await db.select().from(classSessions).orderBy(classSessions.sessionDate);
  const selectedSession = sessionId ? (sessions.find((s) => s.id === sessionId) ?? null) : null;

  const walkInCount =
    selectedSession && !selectedSession.isVictoryDay
      ? (
          await db
            .select({ count: count() })
            .from(checkIns)
            .innerJoin(participants, eq(checkIns.participantId, participants.id))
            .where(
              and(
                eq(checkIns.classSessionId, selectedSession.id),
                eq(participants.isWalkIn, true)
              )
            )
        )[0]?.count ?? 0
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Admin / Check-in</h2>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Home</Link>
      </div>

      {/* Step 1: Select session */}
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
          Step 1 — Select a Session
        </p>
        <SessionSelect sessions={sessions} selectedId={sessionId} />
        {selectedSession && (
          <div className="mt-2 flex justify-end">
            <SessionAttendeesModal sessionId={selectedSession.id} sessionName={selectedSession.name} />
          </div>
        )}
      </div>

      {/* Step 2: Search participant */}
      {selectedSession && (
        <ParticipantSearch key={selectedSession.id} sessionId={selectedSession.id} sessionName={selectedSession.name} />
      )}

      {/* Walk-in Check-in (not applicable to Victory Day) */}
      {selectedSession && !selectedSession.isVictoryDay && (
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
            Walk-in Check-in —{" "}
            <span className="text-indigo-600 normal-case">{selectedSession.name}</span>
          </p>
          <WalkInForm key={selectedSession.id} sessionId={selectedSession.id} initialCount={walkInCount} />
        </div>
      )}
    </div>
  );
}

import { db } from "@/db";
import { classSessions, checkIns, participants } from "@/db/schema";
import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import Link from "next/link";
import { WalkInForm } from "./WalkInForm";
import { ParticipantSearch } from "./ParticipantSearch";
import { SessionSelect } from "./SessionSelect";
import { SessionAttendeesModal } from "./SessionAttendeesModal";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; year?: string; q?: string }>;
}) {
  const { session, year: yearParam, q: initialQ = "" } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;
  const sessionId = session ? parseInt(session, 10) : null;

  const availableYears = await db
    .selectDistinct({ year: sql<number>`EXTRACT(YEAR FROM ${classSessions.sessionDate})::int` })
    .from(classSessions)
    .orderBy(sql`1 ASC`);

  const sessions = await db
    .select()
    .from(classSessions)
    .where(
      and(
        gte(classSessions.sessionDate, `${year}-01-01`),
        lt(classSessions.sessionDate, `${year + 1}-01-01`)
      )
    )
    .orderBy(classSessions.sessionDate);
  const selectedSession = sessionId ? (sessions.find((s) => s.id === sessionId) ?? null) : null;

  const [{ registeredCount }] = await db
    .select({ registeredCount: count() })
    .from(participants)
    .where(
      and(
        isNull(participants.deletedAt),
        eq(participants.isWalkIn, false),
        gte(participants.createdAt, new Date(`${year}-01-01`)),
        lt(participants.createdAt, new Date(`${year + 1}-01-01`))
      )
    );

  const attendeeCount = selectedSession
    ? (
        await db
          .select({ count: count() })
          .from(checkIns)
          .where(eq(checkIns.classSessionId, selectedSession.id))
      )[0]?.count ?? 0
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Admin / Check-in</h2>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Home</Link>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 w-fit">
        <span className="text-2xl font-bold text-indigo-600">{registeredCount}</span>
        <span className="text-sm text-indigo-500">registered participant{registeredCount !== 1 ? "s" : ""}</span>
      </div>

      {/* Step 1: Select session */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">1</span>
          <p className="text-sm font-semibold text-gray-700">Select a Session</p>
        </div>
        {availableYears.length > 1 && (
          <div className="flex items-center gap-2">
            {availableYears.map(({ year: y }) => (
              <Link
                key={y}
                href={y === currentYear ? "/admin" : `/admin?year=${y}`}
                className={`text-sm font-semibold px-4 py-1.5 rounded-lg border transition ${
                  y === year
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        )}
        <SessionSelect sessions={sessions} selectedId={sessionId} />
        {selectedSession && (
          <SessionAttendeesModal
            sessionId={selectedSession.id}
            sessionName={selectedSession.name}
            attendeeCount={attendeeCount}
          />
        )}
      </div>

      {/* Step 2: Search participant */}
      {selectedSession && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">2</span>
            <p className="text-sm font-semibold text-gray-700">
              Search Participant —{" "}
              <span className="text-indigo-600 font-medium">{selectedSession.name}</span>
            </p>
          </div>
          <ParticipantSearch key={selectedSession.id} sessionId={selectedSession.id} sessionName={selectedSession.name} isVictoryDay={selectedSession.isVictoryDay} initialQ={initialQ} />
        </div>
      )}

      {/* Walk-in Check-in (not applicable to Victory Day) */}
      {selectedSession && !selectedSession.isVictoryDay && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">2.1</span>
            <p className="text-sm font-semibold text-gray-700">
              Walk-in Check-in —{" "}
              <span className="text-indigo-600 font-medium">{selectedSession.name}</span>
            </p>
          </div>
          <WalkInForm key={selectedSession.id} sessionId={selectedSession.id} />
        </div>
      )}
    </div>
  );
}

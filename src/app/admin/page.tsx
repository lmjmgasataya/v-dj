import { db } from "@/db";
import { participants, classSessions, checkIns } from "@/db/schema";
import { ilike, or, eq } from "drizzle-orm";
import Link from "next/link";
import { CheckInPanel } from "./CheckInPanel";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string }>;
}) {
  const { q = "", id } = await searchParams;

  const sessions = await db
    .select()
    .from(classSessions)
    .orderBy(classSessions.sessionDate);

  const results =
    q.trim().length > 0
      ? await db
          .select()
          .from(participants)
          .where(
            or(
              ilike(participants.lastName, `%${q}%`),
              ilike(participants.firstName, `%${q}%`),
              ilike(participants.mobileNumber, `%${q}%`)
            )
          )
          .orderBy(participants.lastName)
          .limit(30)
      : [];

  const selectedId = id ? parseInt(id, 10) : null;

  const selectedParticipant =
    selectedId != null
      ? (await db.select().from(participants).where(eq(participants.id, selectedId)).limit(1))[0]
      : null;

  const participantCheckIns =
    selectedId != null
      ? await db
          .select({
            id: checkIns.id,
            participantId: checkIns.participantId,
            classSessionId: checkIns.classSessionId,
            checkedInAt: checkIns.checkedInAt,
            sessionName: classSessions.name,
            sessionDate: classSessions.sessionDate,
          })
          .from(checkIns)
          .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
          .where(eq(checkIns.participantId, selectedId))
      : [];

  const victorySessions = sessions.filter((s) => s.isVictoryDay);
  const checkedInSessionIds = new Set(participantCheckIns.map((c) => c.classSessionId));
  const hasVictoryDay =
    victorySessions.length > 0 &&
    victorySessions.every((s) => checkedInSessionIds.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Admin / Check-in</h2>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Home</Link>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or mobile number..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
        >
          Search
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results list */}
        <div>
          {q.trim() && results.length === 0 && (
            <p className="text-sm text-gray-500">No participants found for &ldquo;{q}&rdquo;.</p>
          )}
          {results.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                {results.length} result{results.length !== 1 ? "s" : ""} — click to view check-in
              </p>
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin?q=${encodeURIComponent(q)}&id=${p.id}`}
                  className={`block rounded-xl border px-4 py-3 text-sm transition hover:border-indigo-400 ${
                    selectedId === p.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <p className="font-semibold text-gray-900">
                    {p.lastName}, {p.firstName} {p.middleInitial ? `${p.middleInitial}.` : ""}
                  </p>
                  <p className="text-gray-500 mt-0.5">{p.mobileNumber} · {p.lifestage}</p>
                </Link>
              ))}
            </div>
          )}
          {!q.trim() && (
            <p className="text-sm text-gray-400">Search for a participant above to get started.</p>
          )}
        </div>

        {/* Detail / check-in panel */}
        <div>
          {selectedParticipant ? (
            <CheckInPanel
              participant={selectedParticipant}
              sessions={sessions}
              checkIns={participantCheckIns}
              hasVictoryDay={hasVictoryDay}
            />
          ) : (
            q.trim() && results.length > 0 && (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                Select a participant to manage check-in
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

import { db } from "@/db";
import { classSessions, walkIns } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { WalkInForm } from "./WalkInForm";
import { ParticipantSearch } from "./ParticipantSearch";

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
            .from(walkIns)
            .where(eq(walkIns.classSessionId, selectedSession.id))
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sessions.map((s) => {
            const isSelected = s.id === sessionId;
            const dateStr = new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
              weekday: "short", month: "short", day: "numeric", year: "numeric",
            });
            return (
              <Link
                key={s.id}
                href={`/admin?session=${s.id}`}
                className={`rounded-xl border px-4 py-3 text-sm transition hover:border-indigo-400 ${
                  isSelected ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white"
                }`}
              >
                <p className={`font-semibold ${isSelected ? "text-indigo-700" : "text-gray-900"}`}>
                  {s.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
                {s.isVictoryDay && (
                  <span className="inline-block mt-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Victory Day
                  </span>
                )}
              </Link>
            );
          })}
        </div>
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

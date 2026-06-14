import { db } from "@/db";
import { classSessions, checkIns, participants, featureFlags } from "@/db/schema";
import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { currentYearPH } from "@/lib/date";
import Link from "next/link";
import { FEE_CATEGORIES } from "@/components/form";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ParticipantSearch } from "./ParticipantSearch";
import { SessionSelect } from "./SessionSelect";
import { SessionAttendeesModal } from "./SessionAttendeesModal";
import { WalkInForm } from "./WalkInForm";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; year?: string; q?: string }>;
}) {
  const { session, year: yearParam, q: initialQ = "" } = await searchParams;
  const currentYear = currentYearPH();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;
  const sessionId = session ? parseInt(session, 10) : null;

  const [availableYears, sessions, feeBreakdown, flags] = await Promise.all([
    db
      .selectDistinct({ year: sql<number>`EXTRACT(YEAR FROM ${classSessions.sessionDate})::int` })
      .from(classSessions)
      .orderBy(sql`1 ASC`),

    db
      .select()
      .from(classSessions)
      .where(
        and(
          gte(classSessions.sessionDate, `${year}-01-01`),
          lt(classSessions.sessionDate, `${year + 1}-01-01`)
        )
      )
      .orderBy(classSessions.sessionDate),

    db
      .select({ fee: participants.registrationFee, total: count() })
      .from(participants)
      .where(
        and(
          isNull(participants.deletedAt),
          eq(participants.isWalkIn, false),
          gte(participants.createdAt, new Date(`${year}-01-01`)),
          lt(participants.createdAt, new Date(`${year + 1}-01-01`))
        )
      )
      .groupBy(participants.registrationFee)
      .orderBy(participants.registrationFee),

    db.select().from(featureFlags),
  ]);

  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  const registeredCount = feeBreakdown.reduce((s, r) => s + r.total, 0);
  const selectedSession = sessionId ? (sessions.find((s) => s.id === sessionId) ?? null) : null;

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
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Check-in" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Admin / Check-in</h2>
      </div>

      <div className="px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 w-fit flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-indigo-600">{registeredCount}</span>
          <span className="text-sm text-indigo-500">registered participant{registeredCount !== 1 ? "s" : ""} for the selected year</span>
        </div>
        {feeBreakdown.length > 0 && (
          <ul className="flex flex-col gap-0.5 pl-3 border-l-2 border-indigo-200">
            {feeBreakdown.map(({ fee, total }) => {
              const cat = FEE_CATEGORIES.find((f) => f.value === fee);
              return (
                <li key={fee} className="text-sm text-indigo-700">
                  <span className="font-semibold">{total}</span>
                  {" — "}
                  {cat ? `Class ${cat.value} (${cat.description})` : (fee ?? "Unknown")}
                </li>
              );
            })}
          </ul>
        )}
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
      {selectedSession && !selectedSession.allowsWalkIn && (
        <div id="search-participant" className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">2</span>
            <p className="text-sm font-semibold text-gray-700">
              Search Participant —{" "}
              <span className="text-indigo-600 font-medium">{selectedSession.name}</span>
            </p>
          </div>
          <ParticipantSearch key={selectedSession.id} sessionId={selectedSession.id} sessionName={selectedSession.name} isVictoryDay={selectedSession.isVictoryDay} initialQ={initialQ} qrCheckin={flagMap["qr_checkin"] ?? false} />
        </div>
      )}

      {/* Step 3: Add walk-in */}
      {selectedSession && selectedSession.allowsWalkIn && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">2.1</span>
            <p className="text-sm font-semibold text-gray-700">
              Add Walk-in —{" "}
              <span className="text-indigo-600 font-medium">{selectedSession.name}</span>
            </p>
          </div>
          <WalkInForm sessionId={selectedSession.id} newDatePicker={flagMap["new_date_picker"] ?? false} />
        </div>
      )}
    </div>
  );
}

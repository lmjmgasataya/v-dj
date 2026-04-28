import { db } from "@/db";
import { classSessions, checkIns } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import Link from "next/link";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const availableYears = await db
    .selectDistinct({ year: sql<number>`EXTRACT(YEAR FROM ${classSessions.sessionDate})::int` })
    .from(classSessions)
    .orderBy(sql`1 DESC`);

  const sessions = await db
    .select({
      id: classSessions.id,
      name: classSessions.name,
      sessionDate: classSessions.sessionDate,
      isVictoryDay: classSessions.isVictoryDay,
      checkInCount: sql<number>`count(${checkIns.id})::int`,
    })
    .from(classSessions)
    .leftJoin(checkIns, eq(checkIns.classSessionId, classSessions.id))
    .where(
      and(
        gte(classSessions.sessionDate, `${year}-01-01`),
        lt(classSessions.sessionDate, `${year + 1}-01-01`)
      )
    )
    .groupBy(classSessions.id)
    .orderBy(classSessions.sessionDate, classSessions.id);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Class Sessions</h2>
          <p className="text-sm text-gray-500 mt-0.5">{sessions.length} session{sessions.length !== 1 ? "s" : ""} in {year}</p>
        </div>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Home</Link>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        {availableYears.map(({ year: y }) => (
          <Link
            key={y}
            href={y === currentYear ? "/sessions" : `/sessions?year=${y}`}
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

      <div className="flex flex-col gap-3">
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions scheduled for {year}.</p>
        ) : (
          sessions.map((session) => {
            const dateStr = new Date(session.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            });
            const isToday = session.sessionDate === today;
            const isPast = session.sessionDate < today;

            return (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className={`flex items-center justify-between rounded-xl border px-5 py-4 shadow-sm transition hover:shadow-md hover:border-indigo-300 ${
                  isToday ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{session.name}</span>
                    {session.isVictoryDay && (
                      <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        Victory Day
                      </span>
                    )}
                    {isToday && (
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </div>
                  <span className={`text-sm ${isPast ? "text-gray-400" : "text-gray-500"}`}>
                    {dateStr}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{session.checkInCount}</p>
                    <p className="text-xs text-gray-400">checked in</p>
                  </div>
                  <span className="text-gray-300">›</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

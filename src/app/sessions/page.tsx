import { db } from "@/db";
import { classSessions, checkIns, walkIns } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";

export default async function SessionsPage() {
  const sessions = await db
    .select({
      id: classSessions.id,
      name: classSessions.name,
      sessionDate: classSessions.sessionDate,
      isVictoryDay: classSessions.isVictoryDay,
      checkInCount: sql<number>`count(distinct ${checkIns.id})::int`,
      walkInCount: sql<number>`(select count(*)::int from ${walkIns} where ${walkIns.classSessionId} = ${classSessions.id})`,
    })
    .from(classSessions)
    .leftJoin(checkIns, eq(checkIns.classSessionId, classSessions.id))
    .groupBy(classSessions.id)
    .orderBy(classSessions.sessionDate, classSessions.id);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Class Sessions</h2>
          <p className="text-sm text-gray-500 mt-0.5">{sessions.length} sessions scheduled</p>
        </div>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Home</Link>
      </div>

      <div className="flex flex-col gap-3">
        {sessions.map((session) => {
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
                isToday
                  ? "bg-indigo-50 border-indigo-300"
                  : "bg-white border-gray-200"
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
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">{session.checkInCount}</p>
                  <p className="text-xs text-gray-400">registered</p>
                </div>
                {!session.isVictoryDay && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-500">{session.walkInCount}</p>
                    <p className="text-xs text-gray-400">walk-ins</p>
                  </div>
                )}
                <span className="text-gray-300">›</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

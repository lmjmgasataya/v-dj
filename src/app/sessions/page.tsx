import { db } from "@/db";
import { classSessions, checkIns, batches } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { todayPH } from "@/lib/date";
import { BatchSelector } from "./BatchSelector";
import { SessionsNav } from "./SessionsNav";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const { batch: batchParam } = await searchParams;
  const batchId = batchParam ? parseInt(batchParam, 10) : null;

  const session = await getSession();
  const isDeveloper = session?.role === "developer";

  const [allBatches, sessions] = await Promise.all([
    db.select({ id: batches.id, name: batches.name }).from(batches).orderBy(batches.classStartDate),

    db
      .select({
        id: classSessions.id,
        name: classSessions.name,
        sessionDate: classSessions.sessionDate,
        isVictoryDay: classSessions.isVictoryDay,
        checkInCount: sql<number>`count(${checkIns.id}) filter (where ${checkIns.status} != 'Absent')::int`,
        absentCount: sql<number>`count(${checkIns.id}) filter (where ${checkIns.status} = 'Absent')::int`,
      })
      .from(classSessions)
      .leftJoin(checkIns, eq(checkIns.classSessionId, classSessions.id))
      .where(batchId ? eq(classSessions.batchId, batchId) : undefined)
      .groupBy(classSessions.id)
      .orderBy(classSessions.sessionDate, classSessions.id),
  ]);

  const today = todayPH();
  const selectedBatch = allBatches.find((b) => b.id === batchId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Discipleship Journey Portal", href: "/journey" }, { label: "Sessions" }]} />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Class Sessions</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              {selectedBatch ? ` in ${selectedBatch.name}` : ""}
            </p>
          </div>
        </div>
      </div>

      <SessionsNav />

      <div className="flex items-center gap-3">
        <BatchSelector batches={allBatches} selectedId={batchId} />
        {isDeveloper && batchId && (
          <Link
            href={`/sessions/new?batch=${batchId}`}
            className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-4 py-2 rounded-lg transition shrink-0"
          >
            + New Session
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400">
            {batchId ? "No sessions in this batch." : "No sessions found."}
          </p>
        ) : (
          sessions.map((s) => {
            const dateStr = new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "Asia/Manila",
            });
            const isToday = s.sessionDate === today;
            const isPast = s.sessionDate < today;

            return (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className={`flex items-center justify-between rounded-xl border px-5 py-4 shadow-sm transition hover:shadow-md hover:border-indigo-300 ${
                  isToday ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{s.name}</span>
                    {s.isVictoryDay && (
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
                    <p className="text-2xl font-bold text-indigo-600">{s.checkInCount}</p>
                    <p className="text-xs text-gray-400">checked in</p>
                    {s.absentCount > 0 && (
                      <p className="text-xs text-red-500 mt-0.5">{s.absentCount} absent</p>
                    )}
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

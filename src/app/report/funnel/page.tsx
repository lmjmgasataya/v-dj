import { db } from "@/db";
import { participants, classSessions, checkIns } from "@/db/schema";
import { and, count, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { currentYearPH } from "@/lib/date";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FunnelChart } from "./FunnelChart";

export default async function FunnelReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const authSession = await getSession();
  if (authSession?.role !== "developer") redirect("/");

  const { year: yearParam } = await searchParams;
  const currentYear = currentYearPH();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const [sessions, registrants, availableYears] = await Promise.all([
    db
      .select({ id: classSessions.id })
      .from(classSessions)
      .where(
        and(
          gte(classSessions.sessionDate, `${year}-01-01`),
          lt(classSessions.sessionDate, `${year + 1}-01-01`)
        )
      ),

    db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          isNull(participants.deletedAt),
          eq(participants.isWalkIn, false),
          gte(participants.createdAt, new Date(`${year}-01-01`)),
          lt(participants.createdAt, new Date(`${year + 1}-01-01`))
        )
      ),

    db
      .selectDistinct({ year: sql<number>`EXTRACT(YEAR FROM ${classSessions.sessionDate})::int` })
      .from(classSessions)
      .orderBy(sql`1 ASC`),
  ]);

  const totalSessions = sessions.length;
  const sessionIds = sessions.map((s) => s.id);
  const participantIds = registrants.map((p) => p.id);

  const checkInCounts =
    sessionIds.length > 0 && participantIds.length > 0
      ? await db
          .select({ participantId: checkIns.participantId, count: count() })
          .from(checkIns)
          .where(
            and(
              inArray(checkIns.participantId, participantIds),
              inArray(checkIns.classSessionId, sessionIds)
            )
          )
          .groupBy(checkIns.participantId)
      : [];

  const countMap = new Map(checkInCounts.map((r) => [r.participantId, r.count]));

  const distribution = new Map<number, number>();
  for (const p of registrants) {
    const attended = countMap.get(p.id) ?? 0;
    distribution.set(attended, (distribution.get(attended) ?? 0) + 1);
  }

  const funnelData = Array.from({ length: totalSessions + 1 }, (_, i) => ({
    sessions: i,
    label: i === totalSessions ? `${i} ✓` : String(i),
    count: distribution.get(i) ?? 0,
    total: totalSessions,
  }));

  const noneCount = distribution.get(0) ?? 0;
  const completeCount = distribution.get(totalSessions) ?? 0;
  const partialCount = registrants.length - noneCount - completeCount;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Reports", href: "/report" },
            { label: "Completion Funnel" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Completion Funnel</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {registrants.length} participant{registrants.length !== 1 ? "s" : ""} · {totalSessions} session{totalSessions !== 1 ? "s" : ""} in {year}
        </p>
      </div>

      {availableYears.length > 1 && (
        <div className="flex items-center gap-3">
          {availableYears.map(({ year: y }) => (
            <Link
              key={y}
              href={y === currentYear ? "/report/funnel" : `/report/funnel?year=${y}`}
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

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "No Sessions Yet", value: noneCount, color: "text-red-500" },
          { label: "In Progress", value: partialCount, color: "text-indigo-500" },
          { label: "Completed All", value: completeCount, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {registrants.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {Math.round((value / registrants.length) * 100)}% of participants
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">
          Participants by sessions attended
        </p>
        <p className="text-xs text-gray-400 mb-4">
          X-axis = number of sessions attended · ✓ = completed all {totalSessions}
        </p>
        <FunnelChart data={funnelData} />
      </div>
    </div>
  );
}

import { db } from "@/db";
import { classSessions, checkIns, participants } from "@/db/schema";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { currentYearPH } from "@/lib/date";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function abbrev(name: string): string {
  return name
    .replace("Spiritual Foundations", "SF")
    .replace("Making Disciples", "MD")
    .replace(" - Victory Day", "");
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const authSession = await getSession();
  if (authSession?.role !== "developer") redirect("/");

  const { year: yearParam } = await searchParams;
  const currentYear = currentYearPH();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const [sessions, availableYears] = await Promise.all([
    db
      .select()
      .from(classSessions)
      .where(
        and(
          gte(classSessions.sessionDate, `${year}-01-01`),
          lt(classSessions.sessionDate, `${year + 1}-01-01`)
        )
      )
      .orderBy(classSessions.sessionDate, classSessions.id),

    db
      .selectDistinct({ year: sql<number>`EXTRACT(YEAR FROM ${classSessions.sessionDate})::int` })
      .from(classSessions)
      .orderBy(sql`1 ASC`),
  ]);

  const [registrants, allCheckIns] = await Promise.all([
    db
      .select({
        id: participants.id,
        lastName: participants.lastName,
        firstName: participants.firstName,
        middleInitial: participants.middleInitial,
      })
      .from(participants)
      .where(
        and(
          isNull(participants.deletedAt),
          eq(participants.isWalkIn, false),
          gte(participants.createdAt, new Date(`${year}-01-01`)),
          lt(participants.createdAt, new Date(`${year + 1}-01-01`))
        )
      )
      .orderBy(participants.lastName, participants.firstName),

    db
      .select({ participantId: checkIns.participantId, classSessionId: checkIns.classSessionId })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(
        and(
          gte(classSessions.sessionDate, `${year}-01-01`),
          lt(classSessions.sessionDate, `${year + 1}-01-01`)
        )
      ),
  ]);

  const attended = new Set(allCheckIns.map((c) => `${c.participantId}-${c.classSessionId}`));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Attendance Report" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Attendance Report</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {registrants.length} participant{registrants.length !== 1 ? "s" : ""} · {sessions.length} session{sessions.length !== 1 ? "s" : ""} in {year}
        </p>
      </div>

      {availableYears.length > 1 && (
        <div className="flex items-center gap-3">
          {availableYears.map(({ year: y }) => (
            <Link
              key={y}
              href={y === currentYear ? "/report" : `/report?year=${y}`}
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

      {sessions.length === 0 || registrants.length === 0 ? (
        <p className="text-sm text-gray-400">No data for {year}.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 border-b-2 border-r-2 border-gray-200 px-4 py-3 text-left font-semibold text-gray-700 min-w-[220px]">
                  Participant
                </th>
                {sessions.map((s) => (
                  <th
                    key={s.id}
                    title={s.name}
                    className="bg-gray-50 border-b-2 border-r border-gray-200 px-3 py-3 text-center font-medium text-gray-600 min-w-[72px]"
                  >
                    <div className="flex flex-col gap-0.5 items-center">
                      <span className="text-xs font-semibold text-gray-700 leading-snug whitespace-nowrap">
                        {abbrev(s.name)}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          timeZone: "Asia/Manila",
                        })}
                      </span>
                      {s.isVictoryDay && (
                        <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wide">VD</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="bg-gray-50 border-b-2 border-gray-200 px-4 py-3 text-center font-semibold text-gray-700 min-w-[64px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {registrants.map((p, i) => {
                const count = sessions.filter((s) => attended.has(`${p.id}-${s.id}`)).length;
                const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
                return (
                  <tr key={p.id} className={rowBg}>
                    <td className={`sticky left-0 z-10 ${rowBg} border-r-2 border-b border-gray-100 px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap`}>
                      {p.lastName}, {p.firstName}
                      {p.middleInitial ? ` ${p.middleInitial}.` : ""}
                    </td>
                    {sessions.map((s) => {
                      const done = attended.has(`${p.id}-${s.id}`);
                      return (
                        <td
                          key={s.id}
                          className="border-r border-b border-gray-100 px-3 py-2.5 text-center"
                        >
                          {done ? (
                            <svg
                              className="mx-auto w-4 h-4 text-green-600"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={6}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-gray-200 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-gray-100 px-4 py-2.5 text-center font-semibold text-indigo-600 whitespace-nowrap">
                      {count}/{sessions.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

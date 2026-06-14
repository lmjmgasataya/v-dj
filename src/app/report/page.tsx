import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { and, gte, lt, sql } from "drizzle-orm";
import { currentYearPH } from "@/lib/date";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceSearch } from "./AttendanceSearch";
import { AttendanceTable, TableSkeleton } from "./AttendanceTable";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; q?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");

  const { year: yearParam, q = "" } = await searchParams;
  const currentYear = currentYearPH();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;
  const query = q.trim();

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Attendance Report" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Attendance Report</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} in {year}
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
                  ? "bg-[#00428E] text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      )}

      <AttendanceSearch year={year} />

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-400">No sessions for {year}.</p>
      ) : !query ? (
        <p className="text-sm text-gray-400">Type a name above to search participants.</p>
      ) : (
        <Suspense key={query} fallback={<TableSkeleton sessions={sessions} />}>
          <AttendanceTable year={year} query={query} sessions={sessions} />
        </Suspense>
      )}
    </div>
  );
}

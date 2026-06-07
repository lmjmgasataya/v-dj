import { db } from "@/db";
import { participants, classSessions } from "@/db/schema";
import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { currentYearPH } from "@/lib/date";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RegistrationsChart } from "./RegistrationsChart";

export default async function RegistrationsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");

  const { year: yearParam } = await searchParams;
  const currentYear = currentYearPH();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const [dailyCounts, availableYears] = await Promise.all([
    db
      .select({
        date: sql<string>`DATE(${participants.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
        count: count(),
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
      .groupBy(sql`DATE(${participants.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`)
      .orderBy(sql`DATE(${participants.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`),

    db
      .selectDistinct({ year: sql<number>`EXTRACT(YEAR FROM ${classSessions.sessionDate})::int` })
      .from(classSessions)
      .orderBy(sql`1 ASC`),
  ]);

  const total = dailyCounts.reduce((s, d) => s + d.count, 0);
  const peak = dailyCounts.reduce((max, d) => (d.count > max ? d.count : max), 0);

  const chartData = dailyCounts.map((d) => ({
    date: new Date(d.date + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Manila",
    }),
    count: d.count,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Reports", href: "/report" }, { label: "Registrations" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Registrations</h2>
        <p className="text-sm text-gray-500 mt-0.5">Daily sign-ups for {year}</p>
      </div>

      {availableYears.length > 1 && (
        <div className="flex items-center gap-3">
          {availableYears.map(({ year: y }) => (
            <Link
              key={y}
              href={y === currentYear ? "/report/registrations" : `/report/registrations?year=${y}`}
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
          { label: "Total Registered", value: total },
          { label: "Registration Days", value: dailyCounts.length },
          { label: "Peak in a Day", value: peak },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Registrations per day</p>
        <RegistrationsChart data={chartData} />
      </div>
    </div>
  );
}

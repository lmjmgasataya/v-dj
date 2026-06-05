import { db } from "@/db";
import { participants, classSessions } from "@/db/schema";
import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { currentYearPH } from "@/lib/date";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LifestageChart, ServiceChart, AgeChart, GenderChart } from "./DemographicsCharts";

const LIFESTAGE_ORDER = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

const AGE_BUCKETS = ["Under 18", "18–22", "23–27", "28–32", "33–40", "41+"];

function abbrevService(s: string) {
  return s.replace(" - ", " ");
}

export default async function DemographicsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const authSession = await getSession();
  if (authSession?.role !== "developer") redirect("/");

  const { year: yearParam } = await searchParams;
  const currentYear = currentYearPH();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const where = and(
    isNull(participants.deletedAt),
    eq(participants.isWalkIn, false),
    gte(participants.createdAt, new Date(`${year}-01-01`)),
    lt(participants.createdAt, new Date(`${year + 1}-01-01`))
  );

  // Single query — one DB round-trip for all participant breakdowns
  const [rows, availableYears] = await Promise.all([
    db
      .select({
        lifestage: participants.lifestage,
        service: participants.serviceAttending,
        gender: participants.gender,
        ageBucket: sql<string>`CASE
          WHEN ${participants.age} < 18 THEN 'Under 18'
          WHEN ${participants.age} <= 22 THEN '18–22'
          WHEN ${participants.age} <= 27 THEN '23–27'
          WHEN ${participants.age} <= 32 THEN '28–32'
          WHEN ${participants.age} <= 40 THEN '33–40'
          ELSE '41+'
        END`,
      })
      .from(participants)
      .where(where),

    db
      .selectDistinct({ year: sql<number>`EXTRACT(YEAR FROM ${classSessions.sessionDate})::int` })
      .from(classSessions)
      .orderBy(sql`1 ASC`),
  ]);

  const total = rows.length;

  // Build all breakdowns from the single result set in JS
  const lifestageCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();
  const genderCounts = new Map<string, number>();
  const ageCounts = new Map<string, number>();

  for (const r of rows) {
    if (r.lifestage) lifestageCounts.set(r.lifestage, (lifestageCounts.get(r.lifestage) ?? 0) + 1);
    if (r.service) serviceCounts.set(r.service, (serviceCounts.get(r.service) ?? 0) + 1);
    if (r.gender) genderCounts.set(r.gender, (genderCounts.get(r.gender) ?? 0) + 1);
    ageCounts.set(r.ageBucket, (ageCounts.get(r.ageBucket) ?? 0) + 1);
  }

  const lifestageData = LIFESTAGE_ORDER.map((label) => ({
    label,
    count: lifestageCounts.get(label) ?? 0,
  })).filter((r) => r.count > 0);

  const serviceData = Array.from(serviceCounts.entries())
    .map(([label, count]) => ({ label: abbrevService(label), count }))
    .sort((a, b) => b.count - a.count);

  const ageData = AGE_BUCKETS.map((label) => ({ label, count: ageCounts.get(label) ?? 0 }));

  const genderData = Array.from(genderCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Reports", href: "/report" },
            { label: "Demographics" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Demographics</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} participant{total !== 1 ? "s" : ""} registered in {year}
        </p>
      </div>

      {availableYears.length > 1 && (
        <div className="flex items-center gap-3">
          {availableYears.map(({ year: y }) => (
            <Link
              key={y}
              href={y === currentYear ? "/report/demographics" : `/report/demographics?year=${y}`}
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Lifestage</p>
        <p className="text-xs text-gray-400 mb-4">Breakdown by life stage of registered participants</p>
        <LifestageChart data={lifestageData} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Service Attending</p>
        <p className="text-xs text-gray-400 mb-4">Which service time participants are enrolled in</p>
        <ServiceChart data={serviceData} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Gender</p>
        <p className="text-xs text-gray-400 mb-4">Male vs female breakdown</p>
        <GenderChart data={genderData} total={total} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Age Distribution</p>
        <p className="text-xs text-gray-400 mb-4">Participants grouped by age range</p>
        <AgeChart data={ageData} />
      </div>
    </div>
  );
}

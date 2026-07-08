import { db } from "@/db";
import { participants, batches } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LifestageChart, ServiceChart, AgeChart, GenderChart, ChurchChart } from "./DemographicsCharts";
import { BatchPicker } from "../BatchPicker";
import { SERVICE_OPTIONS } from "@/components/form";

const LIFESTAGE_ORDER = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

const AGE_BUCKETS = ["13–20", "21–30", "31–40", "41–50", "51–60", "60+"];

function abbrevService(s: string) {
  return s.replace(" - ", " ");
}

export default async function DemographicsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");

  const { batch: batchParam } = await searchParams;

  const allBatches = await db
    .select({ id: batches.id, name: batches.name, isDefault: batches.isDefault })
    .from(batches)
    .orderBy(batches.createdAt);

  const defaultBatch = allBatches.find((b) => b.isDefault) ?? allBatches[0] ?? null;
  const selectedBatchId = batchParam ? parseInt(batchParam, 10) : (defaultBatch?.id ?? null);
  const selectedBatch = allBatches.find((b) => b.id === selectedBatchId) ?? null;

  const rows =
    selectedBatchId !== null
      ? await db
          .select({
            lifestage: participants.lifestage,
            service: participants.serviceAttending,
            gender: participants.gender,
            previousChurch: participants.previousChurch,
            ageBucket: sql<string>`CASE
              WHEN ${participants.age} <= 20 THEN '13–20'
              WHEN ${participants.age} <= 30 THEN '21–30'
              WHEN ${participants.age} <= 40 THEN '31–40'
              WHEN ${participants.age} <= 50 THEN '41–50'
              WHEN ${participants.age} <= 60 THEN '51–60'
              ELSE '60+'
            END`,
          })
          .from(participants)
          .where(
            and(
              isNull(participants.deletedAt),
              eq(participants.isWalkIn, false),
              eq(participants.batchId, selectedBatchId)
            )
          )
      : [];

  const total = rows.length;

  // Build all breakdowns from the single result set in JS
  const lifestageCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();
  const genderCounts = new Map<string, number>();
  const ageCounts = new Map<string, number>();
  const churchCounts = new Map<string, number>();

  for (const r of rows) {
    if (r.lifestage) lifestageCounts.set(r.lifestage, (lifestageCounts.get(r.lifestage) ?? 0) + 1);
    if (r.service) serviceCounts.set(r.service, (serviceCounts.get(r.service) ?? 0) + 1);
    if (r.gender) genderCounts.set(r.gender, (genderCounts.get(r.gender) ?? 0) + 1);
    ageCounts.set(r.ageBucket, (ageCounts.get(r.ageBucket) ?? 0) + 1);
    const church = r.previousChurch?.trim();
    if (church) churchCounts.set(church, (churchCounts.get(church) ?? 0) + 1);
  }

  const lifestageData = LIFESTAGE_ORDER.map((label) => ({
    label,
    count: lifestageCounts.get(label) ?? 0,
  })).filter((r) => r.count > 0);

  const serviceData = SERVICE_OPTIONS.map((option) => ({
    label: abbrevService(option),
    count: serviceCounts.get(option) ?? 0,
  })).filter((r) => r.count > 0);

  const ageData = AGE_BUCKETS.map((label) => ({ label, count: ageCounts.get(label) ?? 0 }));

  const genderData = Array.from(genderCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const churchData = Array.from(churchCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

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
          {total} participant{total !== 1 ? "s" : ""} in {selectedBatch?.name ?? "—"}
        </p>
      </div>

      <BatchPicker batches={allBatches} selectedId={selectedBatchId} />

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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Previous Church</p>
        <p className="text-xs text-gray-400 mb-4">Top previous churches reported by participants</p>
        <ChurchChart data={churchData} />
      </div>
    </div>
  );
}

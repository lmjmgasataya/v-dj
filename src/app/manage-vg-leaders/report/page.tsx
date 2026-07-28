import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { isNull } from "drizzle-orm";
import { SERVICE_OPTIONS, DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { HorizontalBarChart, AgeChart } from "../Charts";

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

function ageBucket(age: number | null): string | null {
  if (age == null) return null;
  if (age <= 20) return "13–20";
  if (age <= 30) return "21–30";
  if (age <= 40) return "31–40";
  if (age <= 50) return "41–50";
  if (age <= 60) return "51–60";
  return "60+";
}

export default async function VgLeaderReportPage() {
  const leaders = await db
    .select()
    .from(victoryGroupLeaders)
    .where(isNull(victoryGroupLeaders.deletedAt));

  const total = leaders.length;

  const ageCounts = new Map<string, number>();
  const genderCounts = new Map<string, number>();
  const lifestageCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();
  const journeyCounts = new Map<string, number>();
  const leadership113Counts = new Map<string, number>();

  for (const l of leaders) {
    const bucket = ageBucket(l.age);
    if (bucket) ageCounts.set(bucket, (ageCounts.get(bucket) ?? 0) + 1);
    if (l.gender) genderCounts.set(l.gender, (genderCounts.get(l.gender) ?? 0) + 1);
    if (l.lifestage) lifestageCounts.set(l.lifestage, (lifestageCounts.get(l.lifestage) ?? 0) + 1);
    if (l.serviceAttending) serviceCounts.set(l.serviceAttending, (serviceCounts.get(l.serviceAttending) ?? 0) + 1);

    for (const step of (l.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean)) {
      journeyCounts.set(step, (journeyCounts.get(step) ?? 0) + 1);
    }

    const key = l.graduateOfLeadership113 == null ? "Not set" : l.graduateOfLeadership113 ? "Yes" : "No";
    leadership113Counts.set(key, (leadership113Counts.get(key) ?? 0) + 1);
  }

  const ageData = AGE_BUCKETS.map((label) => ({ label, count: ageCounts.get(label) ?? 0 }));
  const genderData = Array.from(genderCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const lifestageData = LIFESTAGE_ORDER.map((label) => ({ label, count: lifestageCounts.get(label) ?? 0 })).filter(
    (r) => r.count > 0
  );
  const serviceData = SERVICE_OPTIONS.map((label) => ({ label, count: serviceCounts.get(label) ?? 0 })).filter(
    (r) => r.count > 0
  );
  const journeyData = DISCIPLESHIP_JOURNEY_STEPS.map((label) => ({ label, count: journeyCounts.get(label) ?? 0 }));
  const leadership113Data = ["Yes", "No", "Not set"].map((label) => ({
    label,
    count: leadership113Counts.get(label) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500 -mt-2">{total} active VG leader{total !== 1 ? "s" : ""}</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Discipleship Journey</p>
        <p className="text-xs text-gray-400 mb-4">How many VG leaders have completed each step</p>
        <HorizontalBarChart data={journeyData} color="#4f46e5" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Graduate of Leadership 113</p>
        <HorizontalBarChart
          data={leadership113Data}
          colors={{ Yes: "#10b981", No: "#f59e0b", "Not set": "#d1d5db" }}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Age</p>
        <AgeChart data={ageData} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Gender</p>
        <HorizontalBarChart data={genderData} colors={{ Male: "#6366f1", Female: "#ec4899" }} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Lifestage</p>
        <HorizontalBarChart data={lifestageData} color="#818cf8" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Service Attending</p>
        <HorizontalBarChart data={serviceData} color="#8b5cf6" />
      </div>
    </div>
  );
}

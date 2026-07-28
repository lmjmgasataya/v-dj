import { db } from "@/db";
import { victoryGroups, victoryGroupLeaders, dayOfWeekEnum, vgFrequencyEnum } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { HorizontalBarChart } from "../Charts";

const DAY_ORDER = dayOfWeekEnum.enumValues;
const FREQUENCY_ORDER = vgFrequencyEnum.enumValues;

const LIFESTAGE_ORDER = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

export default async function VictoryGroupReportPage() {
  const groups = await db
    .select({
      id: victoryGroups.id,
      place: victoryGroups.place,
      day: victoryGroups.day,
      time: victoryGroups.time,
      frequency: victoryGroups.frequency,
      otherFrequency: victoryGroups.otherFrequency,
      lifeStage: victoryGroups.lifeStage,
      intern: victoryGroups.intern,
      isActive: victoryGroups.isActive,
      remarks: victoryGroups.remarks,
      leaderLastName: victoryGroupLeaders.lastName,
      leaderFirstName: victoryGroupLeaders.firstName,
    })
    .from(victoryGroups)
    .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
    .where(isNull(victoryGroups.deletedAt))
    .orderBy(victoryGroups.day, victoryGroups.time);

  const total = groups.length;

  const dayCounts = new Map<string, number>();
  const frequencyCounts = new Map<string, number>();
  const lifeStageCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();

  for (const g of groups) {
    dayCounts.set(g.day, (dayCounts.get(g.day) ?? 0) + 1);
    frequencyCounts.set(g.frequency, (frequencyCounts.get(g.frequency) ?? 0) + 1);
    if (g.lifeStage) lifeStageCounts.set(g.lifeStage, (lifeStageCounts.get(g.lifeStage) ?? 0) + 1);
    const status = g.isActive ? "Active" : "Inactive";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  const dayData = DAY_ORDER.map((label) => ({ label, count: dayCounts.get(label) ?? 0 })).filter((r) => r.count > 0);
  const frequencyData = FREQUENCY_ORDER.map((label) => ({ label, count: frequencyCounts.get(label) ?? 0 })).filter(
    (r) => r.count > 0
  );
  const lifeStageData = LIFESTAGE_ORDER.map((label) => ({ label, count: lifeStageCounts.get(label) ?? 0 })).filter(
    (r) => r.count > 0
  );
  const statusData = ["Active", "Inactive"].map((label) => ({ label, count: statusCounts.get(label) ?? 0 }));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500 -mt-2">{total} active victory group{total !== 1 ? "s" : ""}</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Status</p>
        <HorizontalBarChart data={statusData} colors={{ Active: "#10b981", Inactive: "#9ca3af" }} tooltipLabel="Groups" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Day of Week</p>
        <HorizontalBarChart data={dayData} color="#6366f1" tooltipLabel="Groups" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Frequency</p>
        <HorizontalBarChart data={frequencyData} color="#8b5cf6" tooltipLabel="Groups" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Life Stage</p>
        <HorizontalBarChart data={lifeStageData} color="#818cf8" tooltipLabel="Groups" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">All Victory Groups</h3>
        </div>
        {groups.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No victory groups yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Leader</th>
                  <th className="px-4 py-2 text-left font-medium">Place</th>
                  <th className="px-4 py-2 text-left font-medium">Day</th>
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-4 py-2 text-left font-medium">Frequency</th>
                  <th className="px-4 py-2 text-left font-medium">Life Stage</th>
                  <th className="px-4 py-2 text-left font-medium">Intern</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{g.leaderLastName}, {g.leaderFirstName}</td>
                    <td className="px-4 py-2.5 text-gray-700">{g.place}</td>
                    <td className="px-4 py-2.5 text-gray-500">{g.day}</td>
                    <td className="px-4 py-2.5 text-gray-500">{g.time}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {g.frequency === "Others" ? (g.otherFrequency ?? "Others") : g.frequency}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{g.lifeStage ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-500">{g.intern ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          g.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {g.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

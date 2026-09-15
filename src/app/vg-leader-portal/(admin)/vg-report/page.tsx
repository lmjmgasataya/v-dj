import { db } from "@/db";
import { victoryGroups, victoryGroupLeaders, interns, dayOfWeekEnum, vgFrequencyEnum } from "@/db/schema";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { HorizontalBarChart } from "../Charts";
import { VgReportFilters } from "./VgReportFilters";
import { getSession } from "@/lib/auth";
import { rawServiceValues } from "@/lib/timeService";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const PAGE_SIZE = 20;

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

const TIME_ORDER = Array.from({ length: 18 }, (_, i) => {
  const h = i + 5; // 5 AM to 10 PM
  const ampm = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${ampm}`;
});

type SortKey = "leader" | "place" | "day" | "time" | "frequency" | "lifeStage" | "intern";
type SortDir = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "leader", label: "Leader" },
  { key: "place", label: "Place" },
  { key: "day", label: "Day" },
  { key: "time", label: "Time" },
  { key: "frequency", label: "Frequency" },
  { key: "lifeStage", label: "Life Stage" },
  { key: "intern", label: "Intern" },
];

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

export default async function VictoryGroupReportPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string; service?: string; day?: string; time?: string; lifestage?: string; frequency?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const authSession = await getSession();
  const isLeadPastor = authSession?.role === "lead_pastor";

  const { gender = "", service = "", day = "", time = "", lifestage = "", frequency = "", page: pageParam, sort: sortParam, dir: dirParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const sortKey: SortKey = SORT_COLUMNS.some((c) => c.key === sortParam) ? (sortParam as SortKey) : "day";
  const sortDir: SortDir = dirParam === "desc" ? "desc" : "asc";

  const genderList = gender ? gender.split(",") : [];
  const serviceList = isLeadPastor ? rawServiceValues(authSession?.timeService) : service ? service.split(",") : [];
  const dayList = day ? day.split(",") : [];
  const timeList = time ? time.split(",") : [];
  const lifestageList = lifestage ? lifestage.split(",") : [];
  const frequencyList = frequency ? frequency.split(",") : [];

  const groups = await db
    .select({
      id: victoryGroups.id,
      place: victoryGroups.place,
      day: victoryGroups.day,
      time: victoryGroups.time,
      frequency: victoryGroups.frequency,
      otherFrequency: victoryGroups.otherFrequency,
      lifeStage: victoryGroups.lifeStage,
      remarks: victoryGroups.remarks,
      leaderLastName: victoryGroupLeaders.lastName,
      leaderFirstName: victoryGroupLeaders.firstName,
    })
    .from(victoryGroups)
    .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
    .where(
      and(
        isNull(victoryGroups.deletedAt),
        eq(victoryGroups.type, "victory_group"),
        genderList.length ? inArray(victoryGroupLeaders.gender, genderList) : undefined,
        isLeadPastor || serviceList.length ? inArray(victoryGroupLeaders.serviceAttending, serviceList) : undefined,
        dayList.length ? inArray(victoryGroups.day, dayList as (typeof dayOfWeekEnum.enumValues)[number][]) : undefined,
        timeList.length ? inArray(victoryGroups.time, timeList) : undefined,
        lifestageList.length ? or(...lifestageList.map((ls) => sql`${ls} = ANY(${victoryGroups.lifeStage})`)) : undefined,
        frequencyList.length ? inArray(victoryGroups.frequency, frequencyList as (typeof vgFrequencyEnum.enumValues)[number][]) : undefined,
      )
    );

  const total = groups.length;

  const dayCounts = new Map<string, number>();
  const frequencyCounts = new Map<string, number>();
  const lifeStageCounts = new Map<string, number>();
  const placeCounts = new Map<string, number>();
  const timeCounts = new Map<string, number>();

  for (const g of groups) {
    dayCounts.set(g.day, (dayCounts.get(g.day) ?? 0) + 1);
    frequencyCounts.set(g.frequency, (frequencyCounts.get(g.frequency) ?? 0) + 1);
    for (const stage of g.lifeStage ?? []) {
      lifeStageCounts.set(stage, (lifeStageCounts.get(stage) ?? 0) + 1);
    }
    placeCounts.set(g.place, (placeCounts.get(g.place) ?? 0) + 1);
    timeCounts.set(g.time, (timeCounts.get(g.time) ?? 0) + 1);
  }

  const dayData = DAY_ORDER.map((label) => ({ label, count: dayCounts.get(label) ?? 0 })).filter((r) => r.count > 0);
  const frequencyData = FREQUENCY_ORDER.map((label) => ({ label, count: frequencyCounts.get(label) ?? 0 })).filter(
    (r) => r.count > 0
  );
  const lifeStageData = LIFESTAGE_ORDER.map((label) => ({ label, count: lifeStageCounts.get(label) ?? 0 })).filter(
    (r) => r.count > 0
  );
  const placeData = Array.from(placeCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const timeData = TIME_ORDER.map((label) => ({ label, count: timeCounts.get(label) ?? 0 })).filter(
    (r) => r.count > 0
  );

  const allGroupIds = groups.map((g) => g.id);
  const internRows = allGroupIds.length
    ? await db.select().from(interns).where(and(inArray(interns.victoryGroupId, allGroupIds), isNull(interns.deletedAt)))
    : [];
  const internsByGroup: Record<number, string> = {};
  for (const i of internRows) {
    const name = `${i.lastName}, ${i.firstName}`;
    internsByGroup[i.victoryGroupId] = internsByGroup[i.victoryGroupId] ? `${internsByGroup[i.victoryGroupId]}; ${name}` : name;
  }

  const dayIndex = new Map(DAY_ORDER.map((d, i) => [d, i]));
  const timeIndex = new Map(TIME_ORDER.map((t, i) => [t, i]));
  const frequencyIndex = new Map(FREQUENCY_ORDER.map((f, i) => [f, i]));

  function sortValue(g: (typeof groups)[number], key: SortKey): string | number {
    switch (key) {
      case "leader": return `${g.leaderLastName}, ${g.leaderFirstName}`.toLowerCase();
      case "place": return g.place.toLowerCase();
      case "day": return dayIndex.get(g.day) ?? DAY_ORDER.length;
      case "time": return timeIndex.get(g.time) ?? TIME_ORDER.length;
      case "frequency": return frequencyIndex.get(g.frequency) ?? FREQUENCY_ORDER.length;
      case "lifeStage": return (g.lifeStage?.join(", ") ?? "").toLowerCase();
      case "intern": return (internsByGroup[g.id] ?? "").toLowerCase();
    }
  }

  const sortedGroups = [...groups].sort((a, b) => {
    const av = sortValue(a, sortKey);
    const bv = sortValue(b, sortKey);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageGroups = sortedGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (service) params.set("service", service);
    if (day) params.set("day", day);
    if (time) params.set("time", time);
    if (lifestage) params.set("lifestage", lifestage);
    if (frequency) params.set("frequency", frequency);
    if (sortKey !== "day") params.set("sort", sortKey);
    if (sortDir !== "asc") params.set("dir", sortDir);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/vg-leader-portal/vg-report${qs ? `?${qs}` : ""}`;
  }

  function sortHref(col: SortKey) {
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (service) params.set("service", service);
    if (day) params.set("day", day);
    if (time) params.set("time", time);
    if (lifestage) params.set("lifestage", lifestage);
    if (frequency) params.set("frequency", frequency);
    const nextDir: SortDir = sortKey === col && sortDir === "asc" ? "desc" : "asc";
    params.set("sort", col);
    params.set("dir", nextDir);
    return `/vg-leader-portal/vg-report?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal", href: "/vg-leader-portal" }, { label: "Victory Group Report" }]} />
      <VgReportFilters gender={genderList} service={serviceList} day={dayList} time={timeList} lifestage={lifestageList} frequency={frequencyList} hideServiceFilter={isLeadPastor} />
      <p className="text-sm text-gray-500 -mt-2">{total} active victory group{total !== 1 ? "s" : ""}</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">All Victory Groups</h3>
        </div>
        {groups.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No victory groups yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    {SORT_COLUMNS.map((col) => (
                      <th key={col.key} className="px-4 py-2 text-left font-medium">
                        <Link href={sortHref(col.key)} className="flex items-center gap-0.5 hover:text-gray-800 select-none">
                          {col.label}
                          <span className={sortKey === col.key ? "text-gray-700" : "text-gray-300"}>
                            {sortIcon(col.key, sortKey, sortDir)}
                          </span>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{g.leaderLastName}, {g.leaderFirstName}</td>
                      <td className="px-4 py-2.5 text-gray-700">{g.place}</td>
                      <td className="px-4 py-2.5 text-gray-500">{g.day}</td>
                      <td className="px-4 py-2.5 text-gray-500">{g.time}</td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {g.frequency === "Others" ? (g.otherFrequency ?? "Others") : g.frequency}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{g.lifeStage?.length ? g.lifeStage.join(", ") : "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{internsByGroup[g.id] ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm px-6 py-4 border-t border-gray-100">
                <span className="text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={pageHref(page - 1)}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
                    >
                      ← Previous
                    </Link>
                  ) : (
                    <span className="px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-300 font-medium cursor-not-allowed">
                      ← Previous
                    </span>
                  )}
                  {page < totalPages ? (
                    <Link
                      href={pageHref(page + 1)}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span className="px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-300 font-medium cursor-not-allowed">
                      Next →
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Day of Week</p>
        <HorizontalBarChart data={dayData} color="#6366f1" tooltipLabel="Groups" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Time</p>
        <HorizontalBarChart data={timeData} color="#0ea5e9" tooltipLabel="Groups" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Place</p>
        <HorizontalBarChart data={placeData} color="#f59e0b" tooltipLabel="Groups" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Frequency</p>
        <HorizontalBarChart data={frequencyData} color="#8b5cf6" tooltipLabel="Groups" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Life Stage</p>
        <HorizontalBarChart data={lifeStageData} color="#818cf8" tooltipLabel="Groups" />
      </div>
    </div>
  );
}

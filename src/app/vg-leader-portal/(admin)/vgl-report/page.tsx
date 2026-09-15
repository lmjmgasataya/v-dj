import Link from "next/link";
import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, users, interns, leadershipGroupMembers } from "@/db/schema";
import { and, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { SERVICE_OPTIONS, DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { HorizontalBarChart, AgeChart } from "../Charts";
import { computeProfileProgress } from "@/lib/profileCompleteness";
import { getLiveQuarter, getProfileUpdateQuarters } from "@/lib/vgQuarters";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { rawServiceValues } from "@/lib/timeService";

const lglLeaders = alias(victoryGroupLeaders, "lgl_leaders");

const NOT_SET_SERVICE = "Not Set";

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
  const authSession = await getSession();
  const lockedServiceRawValues =
    authSession?.role === "lead_pastor" ? rawServiceValues(authSession?.timeService) : undefined;

  const [allLeaders, claimedAccounts, activeGroups, lglMemberRows, internRows] = await Promise.all([
    db
      .select()
      .from(victoryGroupLeaders)
      .where(
        and(
          isNull(victoryGroupLeaders.deletedAt),
          lockedServiceRawValues ? inArray(victoryGroupLeaders.serviceAttending, lockedServiceRawValues) : undefined
        )
      ),
    db
      .select({ vgLeaderId: users.vgLeaderId })
      .from(users)
      .where(and(eq(users.role, "vg_leader"), isNotNull(users.pinHash))),
    db
      .select({ vgLeaderId: victoryGroups.vgLeaderId })
      .from(victoryGroups)
      .where(and(isNull(victoryGroups.deletedAt), eq(victoryGroups.isActive, true))),
    db
      .select({
        memberId: victoryGroupLeaders.id,
        memberLastName: victoryGroupLeaders.lastName,
        memberFirstName: victoryGroupLeaders.firstName,
        leaderId: leadershipGroupMembers.leaderId,
        leaderLastName: lglLeaders.lastName,
        leaderFirstName: lglLeaders.firstName,
      })
      .from(leadershipGroupMembers)
      .innerJoin(victoryGroupLeaders, eq(leadershipGroupMembers.memberVgLeaderId, victoryGroupLeaders.id))
      .innerJoin(lglLeaders, eq(leadershipGroupMembers.leaderId, lglLeaders.id))
      .where(and(isNull(victoryGroupLeaders.deletedAt), isNull(lglLeaders.deletedAt))),
    db
      .select({
        lastName: interns.lastName,
        firstName: interns.firstName,
        victoryGroupId: interns.victoryGroupId,
        vgLeaderLastName: victoryGroupLeaders.lastName,
        vgLeaderFirstName: victoryGroupLeaders.firstName,
        vgLeaderId: victoryGroups.vgLeaderId,
        vgPlace: victoryGroups.place,
      })
      .from(interns)
      .innerJoin(victoryGroups, eq(interns.victoryGroupId, victoryGroups.id))
      .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
      .where(and(isNull(interns.deletedAt), isNull(victoryGroups.deletedAt), isNull(victoryGroupLeaders.deletedAt))),
  ]);

  const claimedIds = new Set(claimedAccounts.map((a) => a.vgLeaderId));
  const leaders = allLeaders.filter((l) => claimedIds.has(l.id));

  const total = leaders.length;

  // Quarterly update status (Q1-Q4 checkpoints) — "done" means the leader
  // confirmed/completed their profile within the live quarter.
  const hasActiveGroupIds = new Set(activeGroups.map((g) => g.vgLeaderId));
  const liveQuarter = getLiveQuarter();
  const quarterlyStatusCounts = new Map<string, { total: number; done: number; notDone: number }>();
  const quarterlyRoster: { id: number; name: string; service: string; done: boolean }[] = [];

  if (liveQuarter) {
    for (const l of leaders) {
      const service = l.serviceAttending || NOT_SET_SERVICE;
      const percent = computeProfileProgress(l, hasActiveGroupIds.has(l.id)).percent;
      const liveEntry = getProfileUpdateQuarters(l.updatedAt, percent).find((q) => q.clickable);
      const done = liveEntry?.status === "updated";

      const bucket = quarterlyStatusCounts.get(service) ?? { total: 0, done: 0, notDone: 0 };
      bucket.total += 1;
      if (done) bucket.done += 1;
      else bucket.notDone += 1;
      quarterlyStatusCounts.set(service, bucket);

      quarterlyRoster.push({ id: l.id, name: `${l.lastName}, ${l.firstName}`, service, done });
    }
  }

  const serviceOrderWithNotSet = [...SERVICE_OPTIONS, NOT_SET_SERVICE];
  const quarterlyStatusData = serviceOrderWithNotSet
    .map((service) => ({ service, ...(quarterlyStatusCounts.get(service) ?? { total: 0, done: 0, notDone: 0 }) }))
    .filter((r) => r.total > 0);
  const quarterlyTotals = quarterlyStatusData.reduce(
    (acc, r) => ({ total: acc.total + r.total, done: acc.done + r.done, notDone: acc.notDone + r.notDone }),
    { total: 0, done: 0, notDone: 0 }
  );
  const sortedQuarterlyRoster = [...quarterlyRoster].sort((a, b) => {
    if (a.service !== b.service) return serviceOrderWithNotSet.indexOf(a.service) - serviceOrderWithNotSet.indexOf(b.service);
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

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

  // A VG leader should only be claimed as a member by one Leadership Group Leader.
  const byMember = new Map<number, { name: string; leaders: { id: number; name: string }[] }>();
  for (const r of lglMemberRows) {
    const entry = byMember.get(r.memberId) ?? { name: `${r.memberLastName}, ${r.memberFirstName}`, leaders: [] };
    if (!entry.leaders.some((l) => l.id === r.leaderId)) {
      entry.leaders.push({ id: r.leaderId, name: `${r.leaderLastName}, ${r.leaderFirstName}` });
    }
    byMember.set(r.memberId, entry);
  }
  const duplicateLglMembers = Array.from(byMember.entries())
    .filter(([, v]) => v.leaders.length > 1)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // An intern should only be listed under one Victory Group.
  const byIntern = new Map<string, { name: string; groups: { victoryGroupId: number; vgLeaderId: number; vgLeaderName: string; place: string }[] }>();
  for (const r of internRows) {
    const key = `${r.lastName.trim().toLowerCase()}|${r.firstName.trim().toLowerCase()}`;
    const entry = byIntern.get(key) ?? { name: `${r.lastName}, ${r.firstName}`, groups: [] };
    if (!entry.groups.some((g) => g.victoryGroupId === r.victoryGroupId)) {
      entry.groups.push({
        victoryGroupId: r.victoryGroupId,
        vgLeaderId: r.vgLeaderId,
        vgLeaderName: `${r.vgLeaderLastName}, ${r.vgLeaderFirstName}`,
        place: r.vgPlace,
      });
    }
    byIntern.set(key, entry);
  }
  const duplicateInterns = Array.from(byIntern.values())
    .filter((v) => v.groups.length > 1)
    .sort((a, b) => a.name.localeCompare(b.name));

  const hasDuplicates = duplicateLglMembers.length > 0 || duplicateInterns.length > 0;
  const isLeadPastor = authSession?.role === "lead_pastor";

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal", href: "/vg-leader-portal" }, { label: "VG Leaders Report" }]} />
      <p className="text-sm text-gray-500 -mt-2">{total} VG leader{total !== 1 ? "s" : ""} with a claimed portal account</p>

      {/* Cross-service duplicate detection would leak other services' leader/intern
          names to a locked-down lead_pastor, so it's a developer-only view here. */}
      {!isLeadPastor && (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Duplicates</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            A VG leader should only be led by one Leadership Group Leader, and an intern should only belong to one Victory Group.
          </p>
        </div>
        {hasDuplicates ? (
          <div className="divide-y divide-gray-100">
            {duplicateLglMembers.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  VG Leaders led by more than one Leadership Group Leader ({duplicateLglMembers.length})
                </p>
                <ul className="flex flex-col gap-2">
                  {duplicateLglMembers.map((m) => (
                    <li key={m.id} className="text-sm">
                      <Link href={`/vg-leader-portal/leaders/${m.id}`} className="font-medium text-indigo-600 hover:text-indigo-800 underline">
                        {m.name}
                      </Link>
                      <span className="text-gray-500"> — led by </span>
                      {m.leaders.map((l, i) => (
                        <span key={l.id}>
                          {i > 0 && ", "}
                          <Link href={`/vg-leader-portal/leaders/${l.id}`} className="text-gray-700 hover:text-indigo-800 underline">
                            {l.name}
                          </Link>
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {duplicateInterns.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Interns listed under more than one Victory Group ({duplicateInterns.length})
                </p>
                <ul className="flex flex-col gap-2">
                  {duplicateInterns.map((it) => (
                    <li key={`${it.name}`} className="text-sm">
                      <span className="font-medium text-gray-900">{it.name}</span>
                      <span className="text-gray-500"> — under </span>
                      {it.groups.map((g, i) => (
                        <span key={g.victoryGroupId}>
                          {i > 0 && ", "}
                          <Link href={`/vg-leader-portal/leaders/${g.vgLeaderId}/edit`} className="text-gray-700 hover:text-indigo-800 underline">
                            {g.vgLeaderName} ({g.place})
                          </Link>
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">No duplicates found.</p>
        )}
      </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            Quarterly Update Status{liveQuarter ? ` — ${liveQuarter.label}` : ""}
          </h3>
          {liveQuarter ? (
            <p className="text-xs text-gray-400 mt-0.5">
              {quarterlyTotals.done} done · {quarterlyTotals.notDone} not done · {quarterlyTotals.total} total
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">No live quarterly checkpoint right now.</p>
          )}
        </div>
        {liveQuarter && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Service</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                    <th className="px-4 py-2 text-right font-medium">Done</th>
                    <th className="px-4 py-2 text-right font-medium">Not Done</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quarterlyStatusData.map((r) => (
                    <tr key={r.service} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{r.service}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{r.total}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{r.done}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{r.notDone}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold">
                    <td className="px-4 py-2.5 text-gray-800">Total</td>
                    <td className="px-4 py-2.5 text-right text-gray-800">{quarterlyTotals.total}</td>
                    <td className="px-4 py-2.5 text-right text-gray-800">{quarterlyTotals.done}</td>
                    <td className="px-4 py-2.5 text-right text-gray-800">{quarterlyTotals.notDone}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <details className="border-t border-gray-100">
              <summary className="px-6 py-3 text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer select-none">
                View by leader
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-left font-medium">Service</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedQuarterlyRoster.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{r.name}</td>
                        <td className="px-4 py-2.5 text-gray-500">{r.service}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              r.done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {r.done ? "Done" : "Not Done"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>

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

import Link from "next/link";
import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, users, interns, leadershipGroupMembers } from "@/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { SERVICE_OPTIONS, DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { HorizontalBarChart, AgeChart } from "../Charts";
import { computeProfileProgress } from "@/lib/profileCompleteness";
import { getLiveQuarter, getProfileUpdateQuarters } from "@/lib/vgQuarters";
import { getQuarterOptions } from "@/lib/vgQuarterFlags";
import { leadership113Label } from "@/lib/leadership113";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { rawServiceValues } from "@/lib/timeService";
import { QuarterlyStatusTable } from "./QuarterlyStatusTable";
import { QuarterlyRosterTable } from "./QuarterlyRosterTable";
import { NewLeadersTable } from "./NewLeadersTable";
import { IssueTable, type IssueRow } from "./IssueTable";
import { ReportSideNav, type NavItem } from "./ReportSideNav";
import { ProfileNotCompletedTable } from "./ProfileNotCompletedTable";
import { getProfileNotCompletedRows, countRemarks } from "@/lib/vglProfileNotCompleted";

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

function IssueSection({ id, title, rows, detailLabel }: { id: string; title: string; rows: IssueRow[]; detailLabel: string }) {
  return (
    <div id={id} className="scroll-mt-20 lg:scroll-mt-6">
      <div className="flex items-center gap-2 px-6 py-3 bg-amber-50 border-y border-amber-100">
        <span className="text-amber-700" aria-hidden>⚠</span>
        <p className="text-sm font-semibold text-amber-800">{title}</p>
        <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          {rows.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <IssueTable rows={rows} detailLabel={detailLabel} />
      </div>
    </div>
  );
}

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

  const isDeveloper = authSession?.role === "developer";

  const [allLeaders, vgLeaderAccounts, activeGroups, lglMemberRows, internRows, quarterOptions, notCompletedRows] = await Promise.all([
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
      .select({ vgLeaderId: users.vgLeaderId, hasPin: sql<boolean>`${users.pinHash} is not null` })
      .from(users)
      .where(eq(users.role, "vg_leader")),
    db
      .select({ vgLeaderId: victoryGroups.vgLeaderId })
      .from(victoryGroups)
      .where(and(isNull(victoryGroups.deletedAt), eq(victoryGroups.isActive, true))),
    db
      .select({
        memberId: victoryGroupLeaders.id,
        memberLastName: victoryGroupLeaders.lastName,
        memberFirstName: victoryGroupLeaders.firstName,
        memberService: victoryGroupLeaders.serviceAttending,
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
        vgLeaderService: victoryGroupLeaders.serviceAttending,
        vgLeaderId: victoryGroups.vgLeaderId,
        vgPlace: victoryGroups.place,
      })
      .from(interns)
      .innerJoin(victoryGroups, eq(interns.victoryGroupId, victoryGroups.id))
      .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
      .where(and(isNull(interns.deletedAt), isNull(victoryGroups.deletedAt), isNull(victoryGroupLeaders.deletedAt))),
    getQuarterOptions(),
    // Cross-service follow-up list — only rendered (and only worth computing) for developers.
    isDeveloper ? getProfileNotCompletedRows() : Promise.resolve([]),
  ]);

  const claimedIds = new Set(vgLeaderAccounts.filter((a) => a.hasPin).map((a) => a.vgLeaderId));
  // An account row with no PIN only happens after a reset (claiming always sets one).
  const pinResetIds = new Set(vgLeaderAccounts.filter((a) => !a.hasPin).map((a) => a.vgLeaderId));
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
      const liveEntry = getProfileUpdateQuarters(l.updatedAt, percent, quarterOptions).find((q) => q.live);
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

    const key = leadership113Label(l.graduateOfLeadership113) ?? "Not set";
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
  const leadership113Data = ["Yes", "Ongoing", "No", "Not set"].map((label) => ({
    label,
    count: leadership113Counts.get(label) ?? 0,
  }));

  // Service label + sort rank for the Duplicates/Exceptions tables. A row can
  // span several services (e.g. an intern under leaders from different services).
  function serviceInfo(values: (string | null)[]): { service: string; serviceRank: number } {
    const distinct = Array.from(new Set(values.map((v) => v || NOT_SET_SERVICE)));
    const rank = (s: string) => {
      const i = serviceOrderWithNotSet.indexOf(s);
      return i === -1 ? serviceOrderWithNotSet.length : i;
    };
    distinct.sort((a, b) => rank(a) - rank(b));
    return { service: distinct.join(", "), serviceRank: rank(distinct[0]) };
  }

  const groupLinks = (groups: { victoryGroupId: number; vgLeaderId: number; vgLeaderName: string; place: string }[]) =>
    groups.map((g, i) => (
      <span key={g.victoryGroupId}>
        {i > 0 && ", "}
        <Link href={`/vg-leader-portal/leaders/${g.vgLeaderId}/edit`} className="text-gray-700 hover:text-indigo-800 underline">
          {g.vgLeaderName} ({g.place})
        </Link>
      </span>
    ));

  // A VG leader should only be claimed as a member by one Leadership Group Leader.
  const byMember = new Map<number, { name: string; service: string | null; leaders: { id: number; name: string }[] }>();
  for (const r of lglMemberRows) {
    const entry = byMember.get(r.memberId) ?? {
      name: `${r.memberLastName}, ${r.memberFirstName}`,
      service: r.memberService,
      leaders: [],
    };
    if (!entry.leaders.some((l) => l.id === r.leaderId)) {
      entry.leaders.push({ id: r.leaderId, name: `${r.leaderLastName}, ${r.leaderFirstName}` });
    }
    byMember.set(r.memberId, entry);
  }
  const duplicateLglMembers: IssueRow[] = Array.from(byMember.entries())
    .filter(([, v]) => v.leaders.length > 1)
    .map(([id, v]) => ({
      key: String(id),
      name: v.name,
      nameHref: `/vg-leader-portal/leaders/${id}`,
      ...serviceInfo([v.service]),
      detailSort: v.leaders.map((l) => l.name).join("; "),
      detail: v.leaders.map((l, i) => (
        <span key={l.id}>
          {i > 0 && ", "}
          <Link href={`/vg-leader-portal/leaders/${l.id}`} className="text-gray-700 hover:text-indigo-800 underline">
            {l.name}
          </Link>
        </span>
      )),
    }));

  // An intern should only be listed under one Victory Group.
  const byIntern = new Map<
    string,
    {
      name: string;
      groups: { victoryGroupId: number; vgLeaderId: number; vgLeaderName: string; vgLeaderService: string | null; place: string }[];
    }
  >();
  for (const r of internRows) {
    const key = `${r.lastName.trim().toLowerCase()}|${r.firstName.trim().toLowerCase()}`;
    const entry = byIntern.get(key) ?? { name: `${r.lastName}, ${r.firstName}`, groups: [] };
    if (!entry.groups.some((g) => g.victoryGroupId === r.victoryGroupId)) {
      entry.groups.push({
        victoryGroupId: r.victoryGroupId,
        vgLeaderId: r.vgLeaderId,
        vgLeaderName: `${r.vgLeaderLastName}, ${r.vgLeaderFirstName}`,
        vgLeaderService: r.vgLeaderService,
        place: r.vgPlace,
      });
    }
    byIntern.set(key, entry);
  }
  const duplicateInterns: IssueRow[] = Array.from(byIntern.entries())
    .filter(([, v]) => v.groups.length > 1)
    .map(([key, v]) => ({
      key,
      name: v.name,
      ...serviceInfo(v.groups.map((g) => g.vgLeaderService)),
      detailSort: v.groups.map((g) => g.vgLeaderName).join("; "),
      detail: groupLinks(v.groups),
    }));

  const hasDuplicates = duplicateLglMembers.length > 0 || duplicateInterns.length > 0;
  const isLeadPastor = authSession?.role === "lead_pastor";

  // An intern who has since become a VG leader in their own right shouldn't
  // still be reported as an intern by their old VG leader.
  const leaderByName = new Map<string, { id: number; name: string; service: string | null }[]>();
  for (const l of allLeaders) {
    const key = `${l.lastName.trim().toLowerCase()}|${l.firstName.trim().toLowerCase()}`;
    const arr = leaderByName.get(key) ?? [];
    arr.push({ id: l.id, name: `${l.lastName}, ${l.firstName}`, service: l.serviceAttending });
    leaderByName.set(key, arr);
  }
  const internsAlreadyVgl: IssueRow[] = Array.from(byIntern.entries())
    .map(([key, v]) => ({ key, ...v, matches: leaderByName.get(key) ?? [] }))
    .filter((v) => v.matches.length > 0)
    .map((v) => ({
      key: v.key,
      name: v.name,
      nameHref: `/vg-leader-portal/leaders/${v.matches[0].id}`,
      ...serviceInfo(v.matches.map((m) => m.service)),
      detailSort: v.groups.map((g) => g.vgLeaderName).join("; "),
      detail: groupLinks(v.groups),
    }));

  // A leader whose profile is complete should also be able to get into the portal.
  const completedWithoutPin: IssueRow[] = allLeaders
    .filter((l) => l.profileCompleted && !claimedIds.has(l.id))
    .map((l) => {
      const reason = pinResetIds.has(l.id) ? "PIN reset, new PIN not set yet" : "Never claimed";
      return {
        key: String(l.id),
        name: `${l.lastName}, ${l.firstName}`,
        nameHref: `/vg-leader-portal/leaders/${l.id}`,
        ...serviceInfo([l.serviceAttending]),
        detailSort: reason,
        detail: reason,
      };
    });

  const hasExceptions = internsAlreadyVgl.length > 0 || completedWithoutPin.length > 0;

  const notCompletedRemarkCounts = countRemarks(notCompletedRows);

  // Recognize VG leaders who started leading this year.
  const newLeaders = allLeaders
    .filter((l) => l.startedLeadingVg === "this_year")
    .map((l) => ({
      id: l.id,
      name: `${l.lastName}, ${l.firstName}`,
      service: l.serviceAttending || NOT_SET_SERVICE,
      claimed: claimedIds.has(l.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Section titles are shared by the headings and the side menu.
  const T = {
    dupLgl: "VG Leaders led by more than one Leadership Group Leader",
    dupInterns: "Interns listed under more than one Victory Group",
    internsAlreadyVgl: "Already a VG Leader but still reported as an Intern",
    completedWithoutPin: "Profile completed but not claimed, or PIN reset and not set again",
  };
  const issue = (id: string, label: string, rows: IssueRow[]): NavItem[] =>
    rows.length > 0 ? [{ id, label, count: rows.length }] : [];

  const navItems: NavItem[] = [
    ...(!isLeadPastor
      ? [
          {
            id: "duplicates",
            label: "Duplicates",
            children: [
              ...issue("dup-lgl-members", T.dupLgl, duplicateLglMembers),
              ...issue("dup-interns", T.dupInterns, duplicateInterns),
            ],
          },
          {
            id: "exceptions",
            label: "Exceptions",
            children: [
              ...issue("interns-already-vgl", T.internsAlreadyVgl, internsAlreadyVgl),
              ...issue("completed-without-pin", T.completedWithoutPin, completedWithoutPin),
            ],
          },
          { id: "profile-not-completed", label: "Profile Not Yet Completed", count: notCompletedRows.length },
        ]
      : []),
    { id: "quarterly-status", label: `Quarterly Update Status${liveQuarter ? ` — ${liveQuarter.label}` : ""}` },
    { id: "new-leaders", label: "Started Leading This Year", count: newLeaders.length },
    {
      id: "charts",
      label: "Charts",
      children: [
        { id: "chart-journey", label: "Discipleship Journey" },
        { id: "chart-l113", label: "Graduate of Leadership 113" },
        { id: "chart-age", label: "Age" },
        { id: "chart-gender", label: "Gender" },
        { id: "chart-lifestage", label: "Lifestage" },
        { id: "chart-service", label: "Service Serving/Volunteering" },
      ],
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:gap-6 lg:items-start 2xl:block">
    <ReportSideNav items={navItems} />
    <div className="flex-1 flex flex-col gap-6 min-w-0">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal", href: "/vg-leader-portal" }, { label: "VG Leaders Report" }]} />
      <p className="text-sm text-gray-500 -mt-2">{total} VG leader{total !== 1 ? "s" : ""} with a claimed portal account</p>

      {/* Cross-service duplicate detection would leak other services' leader/intern
          names to a locked-down lead_pastor, so it's a developer-only view here. */}
      {!isLeadPastor && (
      <>
      <div id="duplicates" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Duplicates</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            A VG leader should only be led by one Leadership Group Leader, and an intern should only belong to one Victory Group.
          </p>
        </div>
        {hasDuplicates ? (
          <div className="divide-y divide-gray-100">
            {duplicateLglMembers.length > 0 && (
              <IssueSection
                id="dup-lgl-members"
                title={T.dupLgl}
                rows={duplicateLglMembers}
                detailLabel="Led By"
              />
            )}
            {duplicateInterns.length > 0 && (
              <IssueSection
                id="dup-interns"
                title={T.dupInterns}
                rows={duplicateInterns}
                detailLabel="Listed Under"
              />
            )}
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">No duplicates found.</p>
        )}
      </div>

      <div id="exceptions" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Exceptions</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Data mismatches worth cleaning up between Discipleship Journey and VG Leader records.
          </p>
        </div>
        {hasExceptions ? (
          <div className="divide-y divide-gray-100">
            {internsAlreadyVgl.length > 0 && (
              <IssueSection
                id="interns-already-vgl"
                title={T.internsAlreadyVgl}
                rows={internsAlreadyVgl}
                detailLabel="Still Intern Under"
              />
            )}
            {completedWithoutPin.length > 0 && (
              <IssueSection
                id="completed-without-pin"
                title={T.completedWithoutPin}
                rows={completedWithoutPin}
                detailLabel="Reason"
              />
            )}
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">No exceptions found.</p>
        )}
      </div>

      <div id="profile-not-completed" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Profile Not Yet Completed ({notCompletedRows.length})</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              VG leaders to follow up so they finish their profile. A leader with more than one reason has every remark listed.
            </p>
          </div>
          {notCompletedRows.length > 0 && (
            <a
              href="/vg-leader-portal/vgl-report/export"
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              ⬇ Download Excel
            </a>
          )}
        </div>
        {notCompletedRows.length > 0 ? (
          <ProfileNotCompletedTable rows={notCompletedRows} remarkCounts={notCompletedRemarkCounts} />
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">Everyone identified has completed their profile.</p>
        )}
      </div>
      </>
      )}

      <div id="quarterly-status" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
              <QuarterlyStatusTable data={quarterlyStatusData} totals={quarterlyTotals} />
            </div>
            <details className="border-t border-gray-100">
              <summary className="px-6 py-3 text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer select-none">
                View by leader
              </summary>
              <div className="overflow-x-auto">
                <QuarterlyRosterTable rows={quarterlyRoster} />
              </div>
            </details>
          </>
        )}
      </div>

      <div id="new-leaders" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Started Leading This Year ({newLeaders.length})</h3>
          <p className="text-xs text-gray-400 mt-0.5">New VG leaders to recognize.</p>
        </div>
        {newLeaders.length > 0 ? (
          <div className="overflow-x-auto">
            <NewLeadersTable rows={newLeaders} />
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">No new VG leaders this year yet.</p>
        )}
      </div>

      <div id="charts" className="scroll-mt-20 lg:scroll-mt-6 flex flex-col gap-6">
      <div id="chart-journey" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Discipleship Journey</p>
        <p className="text-xs text-gray-400 mb-4">How many VG leaders have completed each step</p>
        <HorizontalBarChart data={journeyData} color="#4f46e5" />
      </div>

      <div id="chart-l113" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Graduate of Leadership 113</p>
        <HorizontalBarChart
          data={leadership113Data}
          colors={{ Yes: "#10b981", Ongoing: "#3b82f6", No: "#f59e0b", "Not set": "#d1d5db" }}
        />
      </div>

      <div id="chart-age" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Age</p>
        <AgeChart data={ageData} />
      </div>

      <div id="chart-gender" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Gender</p>
        <HorizontalBarChart data={genderData} colors={{ Male: "#6366f1", Female: "#ec4899" }} />
      </div>

      <div id="chart-lifestage" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Lifestage</p>
        <HorizontalBarChart data={lifestageData} color="#818cf8" />
      </div>

      <div id="chart-service" className="scroll-mt-20 lg:scroll-mt-6 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Service Serving/Volunteering</p>
        <HorizontalBarChart data={serviceData} color="#8b5cf6" />
      </div>
      </div>
    </div>
    </div>
  );
}

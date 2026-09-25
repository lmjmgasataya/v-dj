import Link from "next/link";
import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, users, interns, leadershipGroupMembers, participants } from "@/db/schema";
import { and, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { SERVICE_OPTIONS, DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { HorizontalBarChart, AgeChart } from "../Charts";
import { computeProfileProgress } from "@/lib/profileCompleteness";
import { getLiveQuarter, getProfileUpdateQuarters } from "@/lib/vgQuarters";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { rawServiceValues } from "@/lib/timeService";
import { QuarterlyStatusTable } from "./QuarterlyStatusTable";
import { QuarterlyRosterTable } from "./QuarterlyRosterTable";
import { NewLeadersTable } from "./NewLeadersTable";
import { IssueTable, type IssueRow } from "./IssueTable";

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

function IssueSection({ title, rows, detailLabel }: { title: string; rows: IssueRow[]; detailLabel: string }) {
  return (
    <div>
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

  const [allLeaders, claimedAccounts, activeGroups, lglMemberRows, internRows, participantIdentifiedRows] = await Promise.all([
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
    db
      .select({
        vgLeaderId: participants.vgLeaderId,
        participantId: participants.id,
        participantLastName: participants.lastName,
        participantFirstName: participants.firstName,
        leaderLastName: victoryGroupLeaders.lastName,
        leaderFirstName: victoryGroupLeaders.firstName,
        leaderService: victoryGroupLeaders.serviceAttending,
      })
      .from(participants)
      .innerJoin(victoryGroupLeaders, eq(participants.vgLeaderId, victoryGroupLeaders.id))
      .where(
        and(
          isNull(participants.deletedAt),
          isNotNull(participants.vgLeaderId),
          isNull(victoryGroupLeaders.deletedAt),
          eq(victoryGroupLeaders.registeredMode, "participant_registration"),
          eq(victoryGroupLeaders.profileCompleted, false)
        )
      ),
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

  // A VG leader created from a participant naming them (rather than the leader
  // registering themselves) should eventually complete their own profile.
  const byIdentifiedLeader = new Map<
    number,
    { name: string; service: string | null; participants: { id: number; name: string }[] }
  >();
  for (const r of participantIdentifiedRows) {
    const entry = byIdentifiedLeader.get(r.vgLeaderId!) ?? {
      name: `${r.leaderLastName}, ${r.leaderFirstName}`,
      service: r.leaderService,
      participants: [],
    };
    entry.participants.push({ id: r.participantId, name: `${r.participantLastName}, ${r.participantFirstName}` });
    byIdentifiedLeader.set(r.vgLeaderId!, entry);
  }
  const identifiedNotUpdated: IssueRow[] = Array.from(byIdentifiedLeader.entries()).map(([id, v]) => {
    const names = v.participants.map((p) => p.name).join(", ");
    return {
      key: String(id),
      name: v.name,
      nameHref: `/vg-leader-portal/leaders/${id}/edit`,
      ...serviceInfo([v.service]),
      detailSort: names,
      detail: names,
    };
  });

  const hasExceptions = internsAlreadyVgl.length > 0 || identifiedNotUpdated.length > 0;

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

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal", href: "/vg-leader-portal" }, { label: "VG Leaders Report" }]} />
      <p className="text-sm text-gray-500 -mt-2">{total} VG leader{total !== 1 ? "s" : ""} with a claimed portal account</p>

      {/* Cross-service duplicate detection would leak other services' leader/intern
          names to a locked-down lead_pastor, so it's a developer-only view here. */}
      {!isLeadPastor && (
      <>
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
              <IssueSection
                title="VG Leaders led by more than one Leadership Group Leader"
                rows={duplicateLglMembers}
                detailLabel="Led By"
              />
            )}
            {duplicateInterns.length > 0 && (
              <IssueSection
                title="Interns listed under more than one Victory Group"
                rows={duplicateInterns}
                detailLabel="Listed Under"
              />
            )}
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">No duplicates found.</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
                title="Already a VG Leader but still reported as an Intern"
                rows={internsAlreadyVgl}
                detailLabel="Still Intern Under"
              />
            )}
            {identifiedNotUpdated.length > 0 && (
              <IssueSection
                title="Identified as VG Leader by a participant, no updated Discipleship Data"
                rows={identifiedNotUpdated}
                detailLabel="Identified By"
              />
            )}
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">No exceptions found.</p>
        )}
      </div>
      </>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
        <p className="text-sm font-semibold text-gray-700 mb-1">Service Serving/Volunteering</p>
        <HorizontalBarChart data={serviceData} color="#8b5cf6" />
      </div>
    </div>
  );
}

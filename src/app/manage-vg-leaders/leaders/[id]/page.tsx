import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, interns, leadershipGroupMembers } from "@/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { getProfileFreshness, FRESHNESS_BADGE_CLASS } from "@/lib/vgLeaderStatus";

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" });
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value || "—"}</dd>
    </div>
  );
}

export default async function VGLeaderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leaderId = parseInt(id, 10);

  const [[leader], groups] = await Promise.all([
    db.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, leaderId)).limit(1),
    db
      .select()
      .from(victoryGroups)
      .where(and(eq(victoryGroups.vgLeaderId, leaderId), isNull(victoryGroups.deletedAt)))
      .orderBy(victoryGroups.createdAt),
  ]);

  if (!leader) notFound();

  const groupIds = groups.map((g) => g.id);
  const internRows = groupIds.length
    ? await db.select().from(interns).where(inArray(interns.victoryGroupId, groupIds))
    : [];
  const internsByGroup: Record<number, { lastName: string; firstName: string }[]> = {};
  for (const i of internRows) {
    (internsByGroup[i.victoryGroupId] ??= []).push({ lastName: i.lastName, firstName: i.firstName });
  }

  const completedSteps = (leader.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean);
  const freshness = getProfileFreshness(leader.updatedAt);

  const lglMembers = leader.isLeadershipGroupLeader
    ? await db
        .select({
          id: victoryGroupLeaders.id,
          lastName: victoryGroupLeaders.lastName,
          firstName: victoryGroupLeaders.firstName,
        })
        .from(leadershipGroupMembers)
        .innerJoin(victoryGroupLeaders, eq(leadershipGroupMembers.memberVgLeaderId, victoryGroupLeaders.id))
        .where(eq(leadershipGroupMembers.leaderId, leaderId))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Manage VG Leaders", href: "/manage-vg-leaders" },
            { label: "VG Leaders", href: "/manage-vg-leaders/leaders" },
            { label: `${leader.lastName}, ${leader.firstName}` },
          ]}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {leader.lastName}, {leader.firstName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  leader.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {leader.isActive ? "Actively Leading" : "Not Currently Leading"}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  leader.profileCompleted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {leader.profileCompleted ? "Profile Complete" : "Profile Incomplete"}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FRESHNESS_BADGE_CLASS[freshness]}`}>
                Last updated {fmtDate(leader.updatedAt)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Created {fmtDate(leader.createdAt)}</p>
          </div>
          <Link
            href={`/manage-vg-leaders/leaders/${leader.id}/edit`}
            className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shrink-0"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Personal Information</h3>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Row label="Nickname" value={leader.nickname} />
          <Row label="Mobile Number" value={leader.mobileNumber} />
          <Row label="Age" value={leader.age != null ? String(leader.age) : null} />
          <Row label="Gender" value={leader.gender} />
          <Row label="Lifestage" value={leader.lifestage} />
          <Row label="Service Attending" value={leader.serviceAttending} />
          <Row label="Facebook / Messenger Name" value={leader.facebookMessengerName} />
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
              Name of their Victory Group Leader
            </dt>
            <dd className="text-sm text-gray-900">
              {leader.ownVgLeaderId ? (
                <Link
                  href={`/manage-vg-leaders/leaders/${leader.ownVgLeaderId}`}
                  className="text-indigo-600 hover:text-indigo-800 underline"
                >
                  {leader.ownVgLeaderName || "—"}
                </Link>
              ) : (
                leader.ownVgLeaderName || "—"
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Leadership</h3>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Row
            label="Started Leading a Victory Group"
            value={
              leader.startedLeadingVg === "before_this_year"
                ? "Before this year"
                : leader.startedLeadingVg === "this_year"
                  ? "This year"
                  : null
            }
          />
          <Row label="Leadership Group Leader?" value={leader.isLeadershipGroupLeader ? "Yes" : "No"} />
          {leader.isLeadershipGroupLeader && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">VG Leaders they lead</dt>
              <dd className="text-sm text-gray-900">
                {lglMembers.length === 0 ? (
                  "—"
                ) : (
                  <ul className="flex flex-col gap-1">
                    {lglMembers.map((m) => (
                      <li key={m.id}>
                        <Link href={`/manage-vg-leaders/leaders/${m.id}`} className="text-indigo-600 hover:text-indigo-800 underline">
                          {m.lastName}, {m.firstName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Discipleship Journey</h3>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {DISCIPLESHIP_JOURNEY_STEPS.map((s) => (
              <span
                key={s}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  completedSteps.includes(s) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
          <Row
            label="Graduate of Leadership 113?"
            value={leader.graduateOfLeadership113 == null ? null : leader.graduateOfLeadership113 ? "Yes" : "No"}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Victory Groups</h3>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {groups.length === 0 ? (
            <p className="text-sm text-gray-400">No victory groups yet.</p>
          ) : (
            groups.map((g, index) => {
              const groupInterns = internsByGroup[g.id] ?? [];
              const internNames = groupInterns.map((i) => `${i.lastName}, ${i.firstName}`).join("; ");
              return (
                <div key={g.id} className="px-4 py-3 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">Victory Group {index + 1}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {g.place} · {DAY_ABBR[g.day]} · {g.time} ·{" "}
                    {g.frequency === "Others" ? (g.otherFrequency ?? "Others") : g.frequency}
                    {g.lifeStage?.length ? ` · ${g.lifeStage.join(", ")}` : ""}
                    {internNames ? ` · Interns: ${internNames}` : ""}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

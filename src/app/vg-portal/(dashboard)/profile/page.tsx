import type { Metadata } from "next";
import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, interns, leadershipGroupMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { computeProfileProgress } from "@/lib/profileCompleteness";
import { getProfileUpdateQuarters, QUARTER_STATUS_BADGE, QUARTER_STATUS_LABEL } from "@/lib/vgQuarters";
import { getQuarterOptions } from "@/lib/vgQuarterFlags";
import { ProfileForm } from "../ProfileForm";

export const metadata: Metadata = {
  title: "My Victory Group — Victory Iloilo",
  description: "Update your profile, Victory Groups, and Start / Mid / End of Year update status.",
};

export default async function VgPortalProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "vg_leader" || !session.vgLeaderId) {
    redirect("/vg-portal/claim?callbackUrl=/vg-portal/profile");
  }

  const vgLeaderId = session.vgLeaderId;

  const [[leader], groups, quarterOptions] = await Promise.all([
    db.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, vgLeaderId)).limit(1),
    db
      .select()
      .from(victoryGroups)
      .where(and(eq(victoryGroups.vgLeaderId, vgLeaderId), isNull(victoryGroups.deletedAt)))
      .orderBy(victoryGroups.createdAt),
    getQuarterOptions(),
  ]);

  if (!leader) redirect("/login");

  const groupIds = groups.map((g) => g.id);
  const internRows = groupIds.length
    ? await db.select().from(interns).where(and(inArray(interns.victoryGroupId, groupIds), isNull(interns.deletedAt)))
    : [];
  const internsByGroup: Record<number, { lastName: string; firstName: string }[]> = {};
  for (const i of internRows) {
    (internsByGroup[i.victoryGroupId] ??= []).push({ lastName: i.lastName, firstName: i.firstName });
  }

  const hasActiveGroup = groups.some((g) => g.isActive);
  const { percent } = computeProfileProgress(leader, hasActiveGroup);
  const openPeriods = getProfileUpdateQuarters(leader.updatedAt, percent, quarterOptions).filter((q) => q.clickable);
  const livePeriod = openPeriods.find((q) => q.live);
  const gracePeriods = openPeriods.filter((q) => !q.live);

  // Leaders used to stop at the dashboard thinking that was the update, so spell out what
  // "done" means for this period. Button names match ProfileForm.
  const submitSteps = (
    <>
      click <span className="font-semibold">Review Changes</span> at the bottom, then{" "}
      <span className="font-semibold">Confirm &amp; Save Changes</span>
    </>
  );
  const periodNote =
    livePeriod?.status === "not_updated" ? (
      <>
        <p className="font-semibold">You haven&apos;t submitted your {livePeriod.label} update yet.</p>
        <p>
          If your details are still the same, no need to change anything — just {submitSteps} to submit.
        </p>
      </>
    ) : livePeriod?.status === "incomplete" ? (
      <>
        <p className="font-semibold">Your {livePeriod.label} update isn&apos;t complete yet.</p>
        <p>Fill in the missing details below, then {submitSteps}.</p>
      </>
    ) : livePeriod ? (
      <p>
        You&apos;ve already submitted your {livePeriod.label} update. You can still make changes — just{" "}
        {submitSteps} again.
      </p>
    ) : null;

  const lglMemberRows = await db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
    })
    .from(leadershipGroupMembers)
    .innerJoin(victoryGroupLeaders, eq(leadershipGroupMembers.memberVgLeaderId, victoryGroupLeaders.id))
    .where(eq(leadershipGroupMembers.leaderId, vgLeaderId));

  return (
    <>
      {livePeriod && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Now open for updating</p>
              <p className="text-lg font-semibold text-indigo-900">
                {livePeriod.label} Update <span className="text-sm font-normal text-indigo-500">({livePeriod.months})</span>
              </p>
              {gracePeriods.length > 0 && (
                <p className="text-xs text-indigo-600 mt-0.5">
                  Saving also counts for {gracePeriods.map((q) => q.label).join(", ")}.
                </p>
              )}
            </div>
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${QUARTER_STATUS_BADGE[livePeriod.status]}`}>
              {livePeriod.status === "incomplete" ? `${livePeriod.percent}% Complete` : QUARTER_STATUS_LABEL[livePeriod.status]}
            </span>
          </div>
          <div
            className={`rounded-lg px-3 py-2 text-sm flex flex-col gap-0.5 ${
              livePeriod.status === "updated" ? "bg-white/70 text-gray-600" : "bg-amber-100 text-amber-900"
            }`}
          >
            {periodNote}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Victory Group</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {leader.lastName}, {leader.firstName}
        </p>
      </div>

      <ProfileForm
        leader={leader}
        hasActiveGroup={hasActiveGroup}
        leadershipGroupMembers={lglMemberRows}
        groups={groups}
        internsByGroup={internsByGroup}
      />
    </>
  );
}

import type { Metadata } from "next";
import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, interns, leadershipGroupMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileForm } from "../ProfileForm";

export const metadata: Metadata = {
  title: "My Victory Group — Victory Iloilo",
  description: "Update your profile, Victory Groups, and quarterly check-in status.",
};

export default async function VgPortalProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "vg_leader" || !session.vgLeaderId) {
    redirect("/vg-portal/claim?callbackUrl=/vg-portal/profile");
  }

  const vgLeaderId = session.vgLeaderId;

  const [[leader], groups] = await Promise.all([
    db.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, vgLeaderId)).limit(1),
    db
      .select()
      .from(victoryGroups)
      .where(and(eq(victoryGroups.vgLeaderId, vgLeaderId), isNull(victoryGroups.deletedAt)))
      .orderBy(victoryGroups.createdAt),
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

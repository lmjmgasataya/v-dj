import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, interns, leadershipGroupMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileForm } from "../ProfileForm";
import { MyVictoryGroups } from "../MyVictoryGroups";
import { ProfileFreshnessBanner } from "../ProfileFreshnessBanner";

export default async function VgPortalProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "vg_leader" || !session.vgLeaderId) redirect("/");

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
    ? await db.select().from(interns).where(inArray(interns.victoryGroupId, groupIds))
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
      <ProfileFreshnessBanner updatedAt={leader.updatedAt} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Victory Group</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {leader.lastName}, {leader.firstName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              leader.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {leader.isActive ? "Actively Leading" : "Not Currently Leading"}
          </span>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              leader.profileCompleted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {leader.profileCompleted ? "Profile complete" : "Finish setting up your profile"}
          </span>
        </div>
      </div>

      <ProfileForm leader={leader} hasActiveGroup={hasActiveGroup} leadershipGroupMembers={lglMemberRows} />
      <MyVictoryGroups groups={groups} internsByGroup={internsByGroup} />
    </>
  );
}

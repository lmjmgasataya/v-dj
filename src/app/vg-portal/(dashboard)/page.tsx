import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";
import { MyVictoryGroups } from "./MyVictoryGroups";

export default async function VgPortalDashboardPage() {
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
    // "My Participants" is temporarily hidden — see commented block in the JSX below.
    // db
    //   .select()
    //   .from(participants)
    //   .where(and(eq(participants.vgLeaderId, vgLeaderId), isNull(participants.deletedAt)))
    //   .orderBy(participants.lastName),
  ]);

  if (!leader) redirect("/login");

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Victory Group</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {leader.lastName}, {leader.firstName}
        </p>
      </div>

      <ProfileForm leader={leader} />
      <MyVictoryGroups groups={groups} />

      {/* "My Participants" — hidden for now.
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <h2 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">My Participants</h2>
        </div>
        {myParticipants.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">No participants assigned to you yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {myParticipants.map((p) => (
              <li key={p.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {p.lastName}, {p.firstName} {p.middleInitial ?? ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.mobileNumber ?? "—"} · {p.serviceAttending}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.isDoneWithVictoryWeekend
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.isDoneWithVictoryWeekend ? "Victory Weekend Done" : "Not Done"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      */}
    </>
  );
}

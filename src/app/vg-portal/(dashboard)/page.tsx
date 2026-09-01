import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, interns, leadershipGroupMembers, events, eventRegistrations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "./ProfileForm";
import { MyVictoryGroups } from "./MyVictoryGroups";
import { ProfileFreshnessBanner } from "./ProfileFreshnessBanner";

const AUDIENCE_LABEL: Record<string, string> = {
  vg_leader: "VG Leaders",
  intern: "Interns",
};

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

  const upcomingEvents = await db
    .select({ id: events.id, name: events.name, eventDate: events.eventDate, audience: events.audience })
    .from(events)
    .where(and(isNull(events.deletedAt), eq(events.isDone, false)))
    .orderBy(events.eventDate);

  const eventIds = upcomingEvents.map((e) => e.id);
  const myRegs = eventIds.length
    ? await db
        .select({ eventId: eventRegistrations.eventId, willAttend: eventRegistrations.willAttend })
        .from(eventRegistrations)
        .where(and(inArray(eventRegistrations.eventId, eventIds), eq(eventRegistrations.vgLeaderId, vgLeaderId)))
    : [];
  const regByEvent = new Map(myRegs.map((r) => [r.eventId, r.willAttend]));

  return (
    <>
      {upcomingEvents.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Upcoming Events</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingEvents.map((e) => {
              const dateStr = new Date(e.eventDate + "T00:00:00").toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "Asia/Manila",
              });
              const registered = regByEvent.get(e.id);
              return (
                <Link
                  key={e.id}
                  href={`/vg-portal/events/${e.id}`}
                  className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{e.name}</span>
                    {e.audience.map((a) => (
                      <span key={a} className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {AUDIENCE_LABEL[a] ?? a}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{dateStr}</span>
                  <span
                    className={`text-xs font-medium w-fit px-2 py-0.5 rounded-full ${
                      registered === true
                        ? "bg-green-100 text-green-700"
                        : registered === false
                          ? "bg-gray-100 text-gray-500"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {registered === true ? "You're attending" : registered === false ? "Not attending" : "Register now"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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

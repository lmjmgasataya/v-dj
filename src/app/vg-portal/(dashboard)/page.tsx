import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, events, eventRegistrations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { computeProfileProgress } from "@/lib/profileCompleteness";
import { getProfileUpdateQuarters, type QuarterCardStatus } from "@/lib/vgQuarters";
import { ProfileFreshnessBanner } from "./ProfileFreshnessBanner";

const AUDIENCE_LABEL: Record<string, string> = {
  vg_leader: "VG Leaders",
  intern: "Interns",
};

const QUARTER_STATUS_BADGE: Record<QuarterCardStatus, string> = {
  updated: "bg-green-100 text-green-700",
  incomplete: "bg-amber-100 text-amber-700",
  not_updated: "bg-gray-100 text-gray-500",
};

const QUARTER_STATUS_LABEL: Record<QuarterCardStatus, string> = {
  updated: "Updated",
  incomplete: "Incomplete",
  not_updated: "Not Updated",
};

const QUARTER_MONTHS: Record<string, string> = {
  q1: "Jan–Mar",
  q2: "Apr–Jun",
  q3: "Jul–Sep",
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
  ]);

  if (!leader) redirect("/login");

  const hasActiveGroup = groups.some((g) => g.isActive);
  const { percent } = computeProfileProgress(leader, hasActiveGroup);
  const quarters = getProfileUpdateQuarters(leader.updatedAt, percent);

  const upcomingEvents = await db
    .select({ id: events.id, name: events.name, description: events.description, eventDate: events.eventDate, audience: events.audience })
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
          <p className="text-base font-semibold text-gray-700 mb-3">Upcoming Events</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-base">{e.name}</span>
                    {e.audience.map((a) => (
                      <span key={a} className="text-sm font-medium bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                        {AUDIENCE_LABEL[a] ?? a}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">{dateStr}</span>
                  {e.description && <span className="text-sm text-gray-600">{e.description}</span>}
                  <span
                    className={`text-sm font-medium w-fit px-2.5 py-1 rounded-full ${
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

      <ProfileFreshnessBanner
        updatedAt={leader.updatedAt}
        isActive={leader.isActive}
        profileCompleted={leader.profileCompleted}
      />

      <div>
        <p className="text-base font-semibold text-gray-700 mb-1">Profile Updating</p>
        <p className="text-sm text-gray-400 mb-3">Confirm your profile once each quarter.</p>
        <div className="grid grid-cols-1 gap-4">
          {quarters.map((q) => {
            const cardClass =
              "flex flex-col gap-2.5 rounded-xl border p-5 transition " +
              (q.clickable
                ? "border-gray-200 bg-white shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer"
                : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed");

            const content = (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-gray-900 text-base">{q.label}</span>
                  <span className="text-sm text-gray-400">({QUARTER_MONTHS[q.key]})</span>
                </div>
                <span className={`text-sm font-medium w-fit px-2.5 py-1 rounded-full ${QUARTER_STATUS_BADGE[q.status]}`}>
                  {q.status === "incomplete" ? `${q.percent}% Complete` : QUARTER_STATUS_LABEL[q.status]}
                </span>
              </>
            );

            return q.clickable ? (
              <Link key={q.key} href="/vg-portal/profile" className={cardClass}>
                {content}
              </Link>
            ) : (
              <div key={q.key} className={cardClass}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

import { db } from "@/db";
import { events, eventRegistrations, victoryGroupLeaders } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventRegistrationForm } from "./EventRegistrationForm";
import { isRegistrationClosed } from "@/lib/date";
import { EVENT_AUDIENCE_LABEL, formatEventTimeRange, isEventOpenToLeader } from "@/lib/eventAudience";
import { getLiveUpdateStatus } from "@/lib/vgLeaderProfile";

export default async function EventRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: param } = await params;
  const isNumeric = /^\d+$/.test(param);

  const [event] = await db
    .select()
    .from(events)
    .where(and(isNumeric ? eq(events.id, Number(param)) : eq(events.shareToken, param), isNull(events.deletedAt)))
    .limit(1);

  if (!event) notFound();

  const session = await getSession();
  if (!session) redirect(`/vg-portal/claim?callbackUrl=/vg-portal/events/${param}`);
  if (session.role !== "vg_leader" || !session.vgLeaderId) redirect("/");
  const vgLeaderId = session.vgLeaderId;
  const eventId = event.id;

  const [[existingReg], [leader], updateStatus] = await Promise.all([
    db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.vgLeaderId, vgLeaderId)))
      .limit(1),
    db
      .select({ isLeadershipGroupLeader: victoryGroupLeaders.isLeadershipGroupLeader })
      .from(victoryGroupLeaders)
      .where(eq(victoryGroupLeaders.id, vgLeaderId))
      .limit(1),
    getLiveUpdateStatus(vgLeaderId),
  ]);
  const openToLeader = isEventOpenToLeader(event.audience, leader?.isLeadershipGroupLeader ?? false);
  const registrationClosed = isRegistrationClosed(event.registrationDeadline);

  // Leaders confirm attendance only with an up-to-date profile: updated this period and 100%
  // complete. Saving the profile brings them back here (updateOwnProfile).
  if (openToLeader && !registrationClosed && updateStatus !== "updated") {
    redirect(`/vg-portal/profile?callbackUrl=${encodeURIComponent(`/vg-portal/events/${param}`)}`);
  }

  const dateStr = new Date(event.eventDate + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
  const timeStr = formatEventTimeRange(event.startTime, event.endTime);
  const deadlineStr = event.registrationDeadline
    ? new Date(event.registrationDeadline + "T00:00:00").toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
      })
    : null;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/vg-portal" }, { label: event.name }]} />
        <h2 className="text-2xl font-bold text-gray-900">{event.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          {event.audience.map((a) => (
            <span key={a} className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {EVENT_AUDIENCE_LABEL[a] ?? a}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {dateStr}
          {timeStr && ` · ${timeStr}`}
        </p>
        {deadlineStr && !registrationClosed && (
          <p className="text-xs text-gray-400 mt-0.5">Registration open through {deadlineStr}</p>
        )}
        {event.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{event.description}</p>}
      </div>

      {!openToLeader ? (
        <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-6">
          This event is for Leadership Group Leaders only.
        </p>
      ) : registrationClosed ? (
        <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-6">
          Registration for this event ended on {deadlineStr}.
        </p>
      ) : (
        <EventRegistrationForm eventId={eventId} audience={event.audience} defaultWillAttend={existingReg?.willAttend ?? null} />
      )}
    </div>
  );
}

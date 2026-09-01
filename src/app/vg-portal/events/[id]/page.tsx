import { db } from "@/db";
import { events, victoryGroups, interns, eventRegistrations, eventRegistrationInterns } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventRegistrationForm } from "./EventRegistrationForm";

const AUDIENCE_LABEL: Record<string, string> = {
  vg_leader: "VG Leaders",
  intern: "Interns",
};

export default async function EventRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = parseInt(id, 10);

  const session = await getSession();
  if (!session) redirect(`/vg-portal/claim?callbackUrl=/vg-portal/events/${eventId}`);
  if (session.role !== "vg_leader" || !session.vgLeaderId) redirect("/");
  const vgLeaderId = session.vgLeaderId;

  const [[event], [existingReg], myGroups] = await Promise.all([
    db.select().from(events).where(and(eq(events.id, eventId), isNull(events.deletedAt))).limit(1),
    db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.vgLeaderId, vgLeaderId)))
      .limit(1),
    db
      .select()
      .from(victoryGroups)
      .where(and(eq(victoryGroups.vgLeaderId, vgLeaderId), isNull(victoryGroups.deletedAt))),
  ]);

  if (!event) notFound();

  const groupIds = myGroups.map((g) => g.id);
  const myInterns = groupIds.length
    ? await db.select().from(interns).where(inArray(interns.victoryGroupId, groupIds))
    : [];

  let defaultInternIds: number[] = [];
  if (existingReg) {
    const rows = await db
      .select({ internId: eventRegistrationInterns.internId })
      .from(eventRegistrationInterns)
      .where(eq(eventRegistrationInterns.eventRegistrationId, existingReg.id));
    defaultInternIds = rows.map((r) => r.internId);
  }

  const dateStr = new Date(event.eventDate + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/vg-portal" }, { label: event.name }]} />
        <h2 className="text-2xl font-bold text-gray-900">{event.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          {event.audience.map((a) => (
            <span key={a} className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {AUDIENCE_LABEL[a] ?? a}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-1">{dateStr}</p>
      </div>

      <EventRegistrationForm
        eventId={eventId}
        audience={event.audience}
        defaultWillAttend={existingReg?.willAttend ?? null}
        interns={myInterns.map((i) => ({ id: i.id, lastName: i.lastName, firstName: i.firstName }))}
        defaultInternIds={defaultInternIds}
      />
    </div>
  );
}

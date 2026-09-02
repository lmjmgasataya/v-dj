import { db } from "@/db";
import { events, eventCheckIns, eventRegistrations, eventRegistrationInterns } from "@/db/schema";
import { eq, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventCard } from "./EventCard";

export default async function EventsPage() {
  const session = await getSession();
  const isDeveloper = session?.role === "developer";

  const [rows, vglRegCounts, internRegCounts] = await Promise.all([
    db
      .select({
        id: events.id,
        name: events.name,
        description: events.description,
        eventDate: events.eventDate,
        isDone: events.isDone,
        audience: events.audience,
        checkedInCount: sql<number>`count(${eventCheckIns.id})::int`,
      })
      .from(events)
      .leftJoin(eventCheckIns, eq(eventCheckIns.eventId, events.id))
      .where(isNull(events.deletedAt))
      .groupBy(events.id)
      .orderBy(sql`${events.eventDate} desc`),
    db
      .select({ eventId: eventRegistrations.eventId, count: sql<number>`count(*)::int` })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.willAttend, true))
      .groupBy(eventRegistrations.eventId),
    db
      .select({ eventId: eventRegistrations.eventId, count: sql<number>`count(*)::int` })
      .from(eventRegistrationInterns)
      .innerJoin(eventRegistrations, eq(eventRegistrationInterns.eventRegistrationId, eventRegistrations.id))
      .where(eq(eventRegistrations.willAttend, true))
      .groupBy(eventRegistrations.eventId),
  ]);

  const preregisteredByEvent = new Map<number, number>();
  for (const r of vglRegCounts) preregisteredByEvent.set(r.eventId, (preregisteredByEvent.get(r.eventId) ?? 0) + r.count);
  for (const r of internRegCounts) preregisteredByEvent.set(r.eventId, (preregisteredByEvent.get(r.eventId) ?? 0) + r.count);

  const eventRows = rows.map((e) => ({ ...e, preregisteredCount: preregisteredByEvent.get(e.id) ?? 0 }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Event Registration", href: "/event-registration" },
              { label: "Events" },
            ]}
          />
          <h2 className="text-2xl font-bold text-gray-900">Events</h2>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} event{rows.length !== 1 ? "s" : ""}</p>
        </div>
        {isDeveloper && (
          <Link
            href="/event-registration/events/new"
            className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-4 py-2 rounded-lg transition shrink-0"
          >
            + New Event
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {eventRows.length === 0 ? (
          <p className="text-sm text-gray-400">No events yet.</p>
        ) : (
          eventRows.map((e) => <EventCard key={e.id} event={e} isDeveloper={isDeveloper} />)
        )}
      </div>
    </div>
  );
}

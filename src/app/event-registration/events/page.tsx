import { db } from "@/db";
import { events, eventCheckIns } from "@/db/schema";
import { eq, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventCard } from "./EventCard";

export default async function EventsPage() {
  const session = await getSession();
  const isDeveloper = session?.role === "developer";

  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      eventDate: events.eventDate,
      isDone: events.isDone,
      audience: events.audience,
      checkedInCount: sql<number>`count(${eventCheckIns.id})::int`,
    })
    .from(events)
    .leftJoin(eventCheckIns, eq(eventCheckIns.eventId, events.id))
    .where(isNull(events.deletedAt))
    .groupBy(events.id)
    .orderBy(sql`${events.eventDate} desc`);

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
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400">No events yet.</p>
        ) : (
          rows.map((e) => <EventCard key={e.id} event={e} isDeveloper={isDeveloper} />)
        )}
      </div>
    </div>
  );
}

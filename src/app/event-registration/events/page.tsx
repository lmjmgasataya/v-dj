import { db } from "@/db";
import { events, eventCheckIns, eventRegistrations, internEventRegistrations, victoryGroupLeaders, interns, victoryGroups } from "@/db/schema";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventCard } from "./EventCard";
import { rawServiceValues } from "@/lib/timeService";

export default async function EventsPage() {
  const session = await getSession();
  const isDeveloper = session?.role === "developer";
  const isLeadPastor = session?.role === "lead_pastor";
  const lockedServiceRawValues = isLeadPastor ? rawServiceValues(session?.timeService) : undefined;
  const vglServiceFilter = lockedServiceRawValues
    ? inArray(victoryGroupLeaders.serviceAttending, lockedServiceRawValues)
    : undefined;

  // For lead_pastor, resolve their time service to concrete VG-leader and intern ids up
  // front (interns are attributed via their Victory Group's leader), so the check-in
  // count's join can restrict on both eventCheckIns.vgLeaderId and .internId without a
  // raw SQL subquery.
  let lockedVgLeaderIds: number[] | undefined;
  let lockedInternIds: number[] | undefined;
  if (isLeadPastor) {
    const rawValues = rawServiceValues(session?.timeService);
    const [vglRows, internRows] = await Promise.all([
      db.select({ id: victoryGroupLeaders.id }).from(victoryGroupLeaders).where(inArray(victoryGroupLeaders.serviceAttending, rawValues)),
      db
        .select({ id: interns.id })
        .from(interns)
        .innerJoin(victoryGroups, eq(interns.victoryGroupId, victoryGroups.id))
        .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
        .where(inArray(victoryGroupLeaders.serviceAttending, rawValues)),
    ]);
    lockedVgLeaderIds = vglRows.map((r) => r.id);
    lockedInternIds = internRows.map((r) => r.id);
  }

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
      .leftJoin(
        eventCheckIns,
        and(
          eq(eventCheckIns.eventId, events.id),
          lockedVgLeaderIds
            ? or(
                inArray(eventCheckIns.vgLeaderId, lockedVgLeaderIds),
                inArray(eventCheckIns.internId, lockedInternIds!)
              )
            : undefined
        )
      )
      .where(isNull(events.deletedAt))
      .groupBy(events.id)
      .orderBy(sql`${events.eventDate} desc`),
    db
      .select({ eventId: eventRegistrations.eventId, count: sql<number>`count(*)::int` })
      .from(eventRegistrations)
      .innerJoin(victoryGroupLeaders, eq(eventRegistrations.vgLeaderId, victoryGroupLeaders.id))
      .where(and(eq(eventRegistrations.willAttend, true), vglServiceFilter))
      .groupBy(eventRegistrations.eventId),
    db
      .select({ eventId: internEventRegistrations.eventId, count: sql<number>`count(*)::int` })
      .from(internEventRegistrations)
      .innerJoin(interns, eq(internEventRegistrations.internId, interns.id))
      .innerJoin(victoryGroups, eq(interns.victoryGroupId, victoryGroups.id))
      .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
      .where(and(eq(internEventRegistrations.willAttend, true), vglServiceFilter))
      .groupBy(internEventRegistrations.eventId),
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
          eventRows.map((e) => <EventCard key={e.id} event={e} />)
        )}
      </div>
    </div>
  );
}

import { db } from "@/db";
import { events } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventCheckInArea } from "./EventCheckInArea";

export default async function EventCheckInPage() {
  const rows = await db
    .select({ id: events.id, name: events.name, eventDate: events.eventDate, audience: events.audience })
    .from(events)
    .where(and(isNull(events.deletedAt), eq(events.isDone, false)))
    .orderBy(sql`${events.eventDate} desc`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Event Registration", href: "/event-registration" },
            { label: "Check In" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Event Check-In</h2>
      </div>

      <EventCheckInArea events={rows} />
    </div>
  );
}

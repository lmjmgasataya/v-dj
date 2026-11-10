import { todayPH } from "@/lib/date";
import { db } from "@/db";
import { events, featureFlags } from "@/db/schema";
import { and, eq, isNull, sql, gte } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventCheckInArea } from "./EventCheckInArea";

export default async function EventCheckInPage() {
  const [rows, nametagFlag] = await Promise.all([
    db
      .select({ id: events.id, name: events.name, eventDate: events.eventDate, audience: events.audience })
      .from(events)
      // Not done: neither ticked nor past its date (isEventDone).
      .where(and(isNull(events.deletedAt), eq(events.isDone, false), gte(events.eventDate, todayPH())))
      .orderBy(sql`${events.eventDate} desc`),
    db.select({ enabled: featureFlags.enabled }).from(featureFlags).where(eq(featureFlags.key, "event_checkin_nametag")).limit(1),
  ]);

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

      <EventCheckInArea events={rows} nametagsEnabled={nametagFlag[0]?.enabled ?? false} />
    </div>
  );
}

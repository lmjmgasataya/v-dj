import { db } from "@/db";
import { events, eventCheckIns } from "@/db/schema";
import { eq, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventDoneCheckbox } from "./EventDoneCheckbox";

const AUDIENCE_LABEL: Record<string, string> = {
  vg_leader: "VG Leaders",
  intern: "Interns",
};

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
          rows.map((e) => {
            const dateStr = new Date(e.eventDate + "T00:00:00").toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "Asia/Manila",
            });

            return (
              <div
                key={e.id}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
              >
                <EventDoneCheckbox id={e.id} name={e.name} isDone={e.isDone} />
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{e.name}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          e.isDone ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {e.isDone ? "Done" : "Upcoming"}
                      </span>
                      {e.audience.map((a) => (
                        <span key={a} className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {AUDIENCE_LABEL[a] ?? a}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600">{e.checkedInCount}</p>
                      <p className="text-xs text-gray-400">checked in</p>
                    </div>
                    {isDeveloper && (
                      <Link
                        href={`/event-registration/events/${e.id}/edit`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

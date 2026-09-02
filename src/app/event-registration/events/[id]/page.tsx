import { db } from "@/db";
import { events } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { listEventRegisteredAttendees } from "../../check-in/actions";

const AUDIENCE_LABEL: Record<string, string> = {
  vg_leader: "VG Leaders",
  intern: "Interns",
};

const TYPE_LABEL: Record<string, string> = {
  vg_leader: "VG Leader",
  intern: "Intern",
};

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = parseInt(id, 10);

  const [session, [event]] = await Promise.all([
    getSession(),
    db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
      .limit(1),
  ]);

  if (!event) notFound();

  const attendees = await listEventRegisteredAttendees(eventId, event.audience);
  const checkedInCount = attendees.filter((a) => a.checkInId).length;

  const isDeveloper = session?.role === "developer";
  const dateStr = new Date(event.eventDate + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Event Registration", href: "/event-registration" },
              { label: "Events", href: "/event-registration/events" },
              { label: event.name },
            ]}
          />
          <h2 className="text-2xl font-bold text-gray-900">{event.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                event.isDone ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"
              }`}
            >
              {event.isDone ? "Done" : "Upcoming"}
            </span>
            {event.audience.map((a) => (
              <span key={a} className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {AUDIENCE_LABEL[a] ?? a}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-1">{dateStr}</p>
          {event.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{event.description}</p>}
        </div>
        {isDeveloper && (
          <Link
            href={`/event-registration/events/${event.id}/edit`}
            className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shrink-0"
          >
            Edit
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Registered vs Checked In</h3>
          <span className="text-sm font-semibold text-indigo-800">
            {checkedInCount} / {attendees.length}
          </span>
        </div>
        {attendees.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No one has pre-registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-2.5">Name</th>
                  <th className="px-6 py-2.5">Type</th>
                  <th className="px-6 py-2.5">Registered</th>
                  <th className="px-6 py-2.5">Checked In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendees.map((a) => (
                  <tr key={a.key}>
                    <td className="px-6 py-3 font-medium text-gray-900">{a.attendeeName}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {TYPE_LABEL[a.attendeeType] ?? a.attendeeType}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Yes</span>
                    </td>
                    <td className="px-6 py-3">
                      {a.checkedInAt ? (
                        <span className="text-xs text-gray-500">
                          {new Date(a.checkedInAt).toLocaleTimeString("en-PH", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: "Asia/Manila",
                          })}
                        </span>
                      ) : (
                        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Not yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

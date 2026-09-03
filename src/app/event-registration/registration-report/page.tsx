import { db } from "@/db";
import { events, eventRegistrations, victoryGroupLeaders } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SERVICE_OPTIONS } from "@/components/form";
import { EventPicker } from "./EventPicker";

const NOT_SET_BUCKET = "Not Set";

type Status = "Attending" | "Declined" | "Did Not Register";

const STATUS_BADGE: Record<Status, string> = {
  Attending: "bg-green-100 text-green-700",
  Declined: "bg-gray-100 text-gray-500",
  "Did Not Register": "bg-amber-100 text-amber-700",
};

export default async function RegistrationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== "developer" && session.role !== "lead_pastor")) redirect("/");

  const { event: eventParam } = await searchParams;

  const eventList = await db
    .select({ id: events.id, name: events.name, eventDate: events.eventDate })
    .from(events)
    .where(and(isNull(events.deletedAt), sql`'vg_leader' = ANY(${events.audience})`))
    .orderBy(sql`${events.eventDate} desc`);

  const requestedId = eventParam ? parseInt(eventParam, 10) : null;
  const selectedEventId =
    requestedId != null && eventList.some((e) => e.id === requestedId) ? requestedId : (eventList[0]?.id ?? null);

  if (!selectedEventId) {
    return (
      <div className="flex flex-col gap-6">
        <ReportHeader />
        <p className="text-sm text-gray-400">No events with a VG Leader audience yet.</p>
      </div>
    );
  }

  const [leaders, registrations] = await Promise.all([
    db
      .select({ id: victoryGroupLeaders.id, lastName: victoryGroupLeaders.lastName, firstName: victoryGroupLeaders.firstName, serviceAttending: victoryGroupLeaders.serviceAttending })
      .from(victoryGroupLeaders)
      .where(and(isNull(victoryGroupLeaders.deletedAt), eq(victoryGroupLeaders.isActive, true)))
      .orderBy(victoryGroupLeaders.lastName),
    db
      .select({ vgLeaderId: eventRegistrations.vgLeaderId, willAttend: eventRegistrations.willAttend })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, selectedEventId)),
  ]);

  const regByLeader = new Map(registrations.map((r) => [r.vgLeaderId, r.willAttend]));

  const roster = leaders.map((l) => {
    const willAttend = regByLeader.get(l.id);
    const status: Status = willAttend === undefined ? "Did Not Register" : willAttend ? "Attending" : "Declined";
    return {
      id: l.id,
      name: `${l.lastName}, ${l.firstName}`,
      service: l.serviceAttending || NOT_SET_BUCKET,
      status,
    };
  });

  const services = [...SERVICE_OPTIONS, NOT_SET_BUCKET];
  const summary = services
    .map((service) => {
      const rows = roster.filter((r) => r.service === service);
      const attending = rows.filter((r) => r.status === "Attending").length;
      const declined = rows.filter((r) => r.status === "Declined").length;
      const registered = attending + declined;
      return { service, total: rows.length, attending, declined, registered, didNotRegister: rows.length - registered };
    })
    .filter((s) => s.total > 0);

  const totals = summary.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      attending: acc.attending + s.attending,
      declined: acc.declined + s.declined,
      registered: acc.registered + s.registered,
      didNotRegister: acc.didNotRegister + s.didNotRegister,
    }),
    { total: 0, attending: 0, declined: 0, registered: 0, didNotRegister: 0 }
  );

  const statusOrder: Status[] = ["Did Not Register", "Declined", "Attending"];
  const sortedRoster = [...roster].sort((a, b) => {
    if (a.service !== b.service) return services.indexOf(a.service) - services.indexOf(b.service);
    if (a.status !== b.status) return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    return a.name.localeCompare(b.name);
  });

  const selectedEvent = eventList.find((e) => e.id === selectedEventId)!;

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader />

      <EventPicker events={eventList} selectedEventId={selectedEventId} />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{selectedEvent.name} — Registration by Service</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {totals.registered} registered ({totals.attending} attending, {totals.declined} declined) ·{" "}
            {totals.didNotRegister} did not register · {totals.total} active VG leaders total
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Service</th>
                <th className="px-4 py-2 text-right font-bold">
                  <span className="cursor-help border-b border-dotted border-gray-400" title="Total active VG leaders in this service">
                    Total VGL
                  </span>
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  <span className="cursor-help border-b border-dotted border-gray-400" title="Registered and said they will attend">
                    Attending
                  </span>
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  <span className="cursor-help border-b border-dotted border-gray-400" title="Registered and said they won't attend">
                    Declined
                  </span>
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  <span className="cursor-help border-b border-dotted border-gray-400" title="Attending + Declined — everyone who responded either way">
                    Registered
                  </span>
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  <span className="cursor-help border-b border-dotted border-gray-400" title="Have not responded yet">
                    Did Not Register
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.map((s) => (
                <tr key={s.service} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.service}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-800">{s.total}</td>
                  <td className="px-4 py-2.5 text-right text-green-700 bg-green-50">{s.attending}</td>
                  <td className="px-4 py-2.5 text-right text-red-700 bg-red-50">{s.declined}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{s.registered}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600 bg-gray-100">{s.didNotRegister}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-semibold">
                <td className="px-4 py-2.5 text-gray-800">Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-gray-800">{totals.total}</td>
                <td className="px-4 py-2.5 text-right text-green-700 bg-green-50">{totals.attending}</td>
                <td className="px-4 py-2.5 text-right text-red-700 bg-red-50">{totals.declined}</td>
                <td className="px-4 py-2.5 text-right text-gray-800">{totals.registered}</td>
                <td className="px-4 py-2.5 text-right text-gray-600 bg-gray-100">{totals.didNotRegister}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Active VG Leaders</h3>
        </div>
        {sortedRoster.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No active VG leaders on file.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Service</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRoster.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{r.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.service}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>{r.status}</span>
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

function ReportHeader() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Event Registration", href: "/event-registration" },
          { label: "Registration Report" },
        ]}
      />
      <h2 className="text-2xl font-bold text-gray-900">Registration Report</h2>
      <p className="text-sm text-gray-500 mt-0.5">Active VG Leaders who registered and did not register, per event, per service.</p>
    </div>
  );
}

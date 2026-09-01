import { db } from "@/db";
import { events, smsApiKeys, smsMessageTemplates } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventSmsClient } from "./EventSmsClient";

export default async function EventSmsReminderPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const [eventList, templateList, defaultKey] = await Promise.all([
    db
      .select({ id: events.id, name: events.name, eventDate: events.eventDate, audience: events.audience })
      .from(events)
      .where(and(isNull(events.deletedAt), eq(events.isDone, false)))
      .orderBy(desc(events.eventDate)),
    db
      .select({ id: smsMessageTemplates.id, title: smsMessageTemplates.title, message: smsMessageTemplates.message })
      .from(smsMessageTemplates)
      .orderBy(desc(smsMessageTemplates.id)),
    db
      .select({ id: smsApiKeys.id, name: smsApiKeys.name, endpoint: smsApiKeys.endpoint, apiKey: smsApiKeys.apiKey })
      .from(smsApiKeys)
      .where(eq(smsApiKeys.isDefault, true))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Event Registration", href: "/event-registration" },
            { label: "SMS Sender" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Event SMS Reminders</h2>
        <p className="text-sm text-gray-500 mt-0.5">Send reminders to an event&apos;s audience.</p>
      </div>
      <EventSmsClient events={eventList} templates={templateList} defaultKey={defaultKey} />
    </div>
  );
}

import { db } from "@/db";
import { events } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InternRegistrationForm } from "./InternRegistrationForm";

export default async function InternEventRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: param } = await params;
  const isNumeric = /^\d+$/.test(param);

  const [event] = await db
    .select()
    .from(events)
    .where(and(isNumeric ? eq(events.id, Number(param)) : eq(events.shareToken, param), isNull(events.deletedAt)))
    .limit(1);

  if (!event) notFound();

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
        <p className="text-sm text-gray-500 mt-1">{dateStr}</p>
        {event.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{event.description}</p>}
      </div>

      {event.audience.includes("intern") ? (
        <InternRegistrationForm eventId={event.id} />
      ) : (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          This event isn&apos;t open for intern registration.
        </p>
      )}
    </div>
  );
}

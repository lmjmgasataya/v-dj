import { db } from "@/db";
import { events, featureFlags } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EditEventForm } from "./EditEventForm";
import { DeleteButton } from "./DeleteButton";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = parseInt(id, 10);

  const [[event], flags] = await Promise.all([
    db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
      .limit(1),
    db.select().from(featureFlags),
  ]);

  if (!event) notFound();

  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <EditEventForm event={event} newDatePicker={flagMap["new_date_picker"] ?? false} />
      <DeleteButton id={event.id} name={event.name} />
    </div>
  );
}

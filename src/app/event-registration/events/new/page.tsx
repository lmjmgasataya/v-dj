import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage() {
  const flags = await db.select().from(featureFlags);
  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  return <NewEventForm newDatePicker={flagMap["new_date_picker"] ?? false} />;
}

import { db } from "@/db";
import { classSessions, featureFlags } from "@/db/schema";
import { sql } from "drizzle-orm";
import { NewSessionForm } from "./NewSessionForm";

export default async function NewSessionPage() {
  const [rows, flags] = await Promise.all([
    db
      .select({ name: classSessions.name })
      .from(classSessions)
      .groupBy(classSessions.name)
      .orderBy(sql`min(${classSessions.id})`),
    db.select().from(featureFlags),
  ]);

  const existingNames = rows.map((r) => r.name);
  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  return <NewSessionForm existingNames={existingNames} newDatePicker={flagMap["new_date_picker"] ?? false} />;
}

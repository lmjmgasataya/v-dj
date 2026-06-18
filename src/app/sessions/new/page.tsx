import { db } from "@/db";
import { classSessions, featureFlags, batches } from "@/db/schema";
import { sql } from "drizzle-orm";
import { NewSessionForm } from "./NewSessionForm";

export default async function NewSessionPage() {
  const [rows, flags, allBatches] = await Promise.all([
    db
      .select({ name: classSessions.name })
      .from(classSessions)
      .groupBy(classSessions.name)
      .orderBy(sql`min(${classSessions.id})`),
    db.select().from(featureFlags),
    db.select({ id: batches.id, name: batches.name, isDefault: batches.isDefault })
      .from(batches)
      .orderBy(batches.classStartDate),
  ]);

  const existingNames = rows.map((r) => r.name);
  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));
  const defaultBatch = allBatches.find((b) => b.isDefault) ?? allBatches[0] ?? null;

  return (
    <NewSessionForm
      existingNames={existingNames}
      newDatePicker={flagMap["new_date_picker"] ?? false}
      batches={allBatches}
      defaultBatchId={defaultBatch?.id ?? null}
    />
  );
}

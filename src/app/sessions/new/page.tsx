import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { sql } from "drizzle-orm";
import { NewSessionForm } from "./NewSessionForm";

export default async function NewSessionPage() {
  const rows = await db
    .select({ name: classSessions.name })
    .from(classSessions)
    .groupBy(classSessions.name)
    .orderBy(sql`min(${classSessions.id})`);

  const existingNames = rows.map((r) => r.name);

  return <NewSessionForm existingNames={existingNames} />;
}

import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { NewSessionForm } from "./NewSessionForm";

export default async function NewSessionPage() {
  const rows = await db
    .selectDistinct({ name: classSessions.name })
    .from(classSessions)
    .orderBy(classSessions.name);

  const existingNames = rows.map((r) => r.name);

  return <NewSessionForm existingNames={existingNames} />;
}

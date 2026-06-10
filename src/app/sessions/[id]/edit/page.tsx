import { db } from "@/db";
import { classSessions, featureFlags } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EditSessionForm } from "./EditSessionForm";

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  const [[session], nameRows, flags] = await Promise.all([
    db
      .select({ id: classSessions.id, name: classSessions.name, sessionDate: classSessions.sessionDate, allowsWalkIn: classSessions.allowsWalkIn })
      .from(classSessions)
      .where(eq(classSessions.id, sessionId))
      .limit(1),

    db
      .select({ name: classSessions.name })
      .from(classSessions)
      .groupBy(classSessions.name)
      .orderBy(sql`min(${classSessions.id})`),

    db.select().from(featureFlags),
  ]);

  if (!session) notFound();

  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  return <EditSessionForm session={session} existingNames={nameRows.map((r) => r.name)} newDatePicker={flagMap["new_date_picker"] ?? false} />;
}

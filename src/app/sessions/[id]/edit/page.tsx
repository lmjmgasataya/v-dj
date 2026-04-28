import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EditSessionForm } from "./EditSessionForm";

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  const [session] = await db
    .select({ id: classSessions.id, name: classSessions.name, sessionDate: classSessions.sessionDate })
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);

  if (!session) notFound();

  const nameRows = await db
    .select({ name: classSessions.name })
    .from(classSessions)
    .groupBy(classSessions.name)
    .orderBy(sql`min(${classSessions.id})`);

  return <EditSessionForm session={session} existingNames={nameRows.map((r) => r.name)} />;
}

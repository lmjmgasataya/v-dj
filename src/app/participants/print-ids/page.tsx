import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { participants, featureFlags } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";
import { PrintIdsClient } from "./PrintIdsClient";
import { PrintIdsSkeleton } from "./PrintIdsSkeleton";

export default async function PrintIdsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <Suspense fallback={<PrintIdsSkeleton />}>
      <PrintIdsContent />
    </Suspense>
  );
}

async function PrintIdsContent() {
  const [data, flag] = await Promise.all([
    db
      .select({
        id: participants.id,
        firstName: participants.firstName,
        lastName: participants.lastName,
        preferredNameOnId: participants.preferredNameOnId,
      })
      .from(participants)
      .where(isNull(participants.deletedAt))
      .orderBy(participants.lastName, participants.firstName),
    db
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.key, "print_id_show_fullname"))
      .then((rows) => rows[0]?.enabled ?? true),
  ]);

  return <PrintIdsClient participants={data} showFullName={flag} />;
}

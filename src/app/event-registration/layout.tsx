import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function EventRegistrationLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");

  const flag = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, "event_registration"))
    .then((r) => r[0]);
  if (!flag?.enabled) redirect("/");

  return <div className="max-w-4xl mx-auto flex flex-col gap-6">{children}</div>;
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { isNull, count } from "drizzle-orm";
import { PrintBackClient } from "./PrintBackClient";

export default async function PrintBackPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const [{ total }] = await db
    .select({ total: count() })
    .from(participants)
    .where(isNull(participants.deletedAt));

  return <PrintBackClient count={total} />;
}

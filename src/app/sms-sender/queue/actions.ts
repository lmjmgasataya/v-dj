"use server";

import { db } from "@/db";
import { smsLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendSms } from "@/lib/sms";

export async function retrySmsLog(id: number) {
  const session = await getSession();
  if (!session || session.role !== "developer") return;

  const [log] = await db.select().from(smsLogs).where(eq(smsLogs.id, id)).limit(1);
  if (!log) return;

  await sendSms(log.recipientNumber, log.message, log.recipientName, log.participantId);
  revalidatePath("/sms-sender/queue");
}

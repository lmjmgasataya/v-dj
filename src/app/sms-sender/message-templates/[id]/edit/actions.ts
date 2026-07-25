"use server";

import { db } from "@/db";
import { smsMessageTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toastRedirect } from "@/lib/toast";

export async function updateMessageTemplate(id: number, formData: FormData) {
  const title = (formData.get("title") as string).trim();
  const message = (formData.get("message") as string).trim();

  await db
    .update(smsMessageTemplates)
    .set({ title, message })
    .where(eq(smsMessageTemplates.id, id));

  toastRedirect("/sms-sender/message-templates", "Message template updated.");
}

export async function deleteMessageTemplate(id: number) {
  await db.delete(smsMessageTemplates).where(eq(smsMessageTemplates.id, id));
  toastRedirect("/sms-sender/message-templates", "Message template deleted.");
}

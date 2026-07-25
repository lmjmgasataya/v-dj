"use server";

import { db } from "@/db";
import { smsMessageTemplates } from "@/db/schema";
import { toastRedirect } from "@/lib/toast";

export async function createMessageTemplate(formData: FormData) {
  const title = (formData.get("title") as string).trim();
  const message = (formData.get("message") as string).trim();

  await db.insert(smsMessageTemplates).values({ title, message });

  toastRedirect("/sms-sender/message-templates", "Message template created.");
}

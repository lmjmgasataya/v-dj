"use server";

import { db } from "@/db";
import { smsMessageTemplates } from "@/db/schema";
import { redirect } from "next/navigation";

export async function createMessageTemplate(formData: FormData) {
  const title = (formData.get("title") as string).trim();
  const message = (formData.get("message") as string).trim();

  await db.insert(smsMessageTemplates).values({ title, message });

  redirect("/sms-sender/message-templates");
}

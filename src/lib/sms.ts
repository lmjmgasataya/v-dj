import { db } from "@/db";
import { smsApiKeys, smsMessageTemplates, featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const REGISTRATION_TEMPLATE_ID = Number(process.env.SMS_REGISTRATION_TEMPLATE_ID ?? "2");

export async function isRegistrationSmsEnabled(): Promise<boolean> {
  const [flag] = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, "sms_on_registration"))
    .limit(1);
  return flag?.enabled ?? false;
}

export async function getRegistrationSmsTemplate(): Promise<string | null> {
  const [template] = await db
    .select({ message: smsMessageTemplates.message })
    .from(smsMessageTemplates)
    .where(eq(smsMessageTemplates.id, REGISTRATION_TEMPLATE_ID))
    .limit(1);
  return template?.message ?? null;
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";

  const [defaultKey] = await db
    .select({ apiKey: smsApiKeys.apiKey, endpoint: smsApiKeys.endpoint })
    .from(smsApiKeys)
    .where(eq(smsApiKeys.isDefault, true))
    .limit(1);

  const res = await fetch(`${protocol}://${host}/api/sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      message,
      ...(defaultKey?.endpoint ? { endpoint: defaultKey.endpoint } : {}),
      ...(defaultKey?.apiKey ? { authorization: defaultKey.apiKey } : {}),
    }),
  });

  return res.ok;
}

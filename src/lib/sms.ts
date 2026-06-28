import { db } from "@/db";
import { smsApiKeys, smsMessageTemplates, featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";

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

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("639")) return `+${d}`;
  if (d.length === 11 && d.startsWith("09")) return `+63${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("9")) return `+63${d}`;
  return null;
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const normalized = normalizePhone(to);
  if (!normalized) {
    return false;
  }

  const [defaultKey] = await db
    .select({ apiKey: smsApiKeys.apiKey, endpoint: smsApiKeys.endpoint })
    .from(smsApiKeys)
    .where(eq(smsApiKeys.isDefault, true))
    .limit(1);

  const endpoint = defaultKey?.endpoint ?? process.env.SMS_ENDPOINT;
  const authorization = defaultKey?.apiKey ?? process.env.SMS_API_KEY;

  if (!endpoint) {
    console.error("sendSms: no SMS endpoint configured");
    return false;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify({ to: normalized, message }),
  });
  console.log(`SMS sent to ${normalized}. Status: ${res.status}`);

  return res.ok;
}

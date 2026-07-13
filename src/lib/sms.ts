import { db } from "@/db";
import { smsApiKeys, smsMessageTemplates, featureFlags, smsLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

const REGISTRATION_TEMPLATE_ID_CLASS_A_B = Number(process.env.SMS_REGISTRATION_TEMPLATE_ID_CLASS_A_B ?? "2");
const REGISTRATION_TEMPLATE_ID_CLASS_C_D = Number(process.env.SMS_REGISTRATION_TEMPLATE_ID_CLASS_C_D ?? "4");
const DISCIPLER_NOTIFICATION_TEMPLATE_ID = Number(process.env.SMS_DISCIPLER_NOTIFICATION_TEMPLATE_ID ?? "5");

export async function isRegistrationSmsEnabled(): Promise<boolean> {
  const [flag] = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, "sms_on_registration"))
    .limit(1);
  return flag?.enabled ?? false;
}

export async function getDisciplerNotificationTemplate(): Promise<string | null> {
  if (!DISCIPLER_NOTIFICATION_TEMPLATE_ID) return null;
  const [template] = await db
    .select({ message: smsMessageTemplates.message })
    .from(smsMessageTemplates)
    .where(eq(smsMessageTemplates.id, DISCIPLER_NOTIFICATION_TEMPLATE_ID))
    .limit(1);
  return template?.message ?? null;
}

export async function getRegistrationSmsTemplate(registrationFee: string): Promise<string | null> {
  const isClassCD = registrationFee === "C" || registrationFee === "D";
  const templateId = isClassCD ? REGISTRATION_TEMPLATE_ID_CLASS_C_D : REGISTRATION_TEMPLATE_ID_CLASS_A_B;
  const [template] = await db
    .select({ message: smsMessageTemplates.message })
    .from(smsMessageTemplates)
    .where(eq(smsMessageTemplates.id, templateId))
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

// Traccer can return HTTP 200 with a payload reporting per-message failure, so
// HTTP status alone isn't a reliable signal of whether the SMS actually sent.
export function isSmsSuccess(status: number, bodyText: string): boolean {
  if (status < 200 || status >= 300) return false;
  try {
    const json = JSON.parse(bodyText) as { responses?: { success?: boolean }[] };
    if (Array.isArray(json.responses)) {
      return json.responses[0]?.success === true;
    }
  } catch {
    // non-JSON body; fall back to HTTP-level success below
  }
  return true;
}

export async function sendSms(
  to: string,
  message: string,
  recipientName: string,
  participantId: number | null = null,
): Promise<boolean> {
  const normalized = normalizePhone(to);
  if (!normalized) {
    await db.insert(smsLogs).values({ recipientName, recipientNumber: to, message, status: "failed", participantId });
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
    await db.insert(smsLogs).values({ recipientName, recipientNumber: normalized, message, status: "failed", participantId });
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
  const text = await res.text();
  const success = isSmsSuccess(res.status, text);
  console.log(`SMS sent to ${normalized}. Status: ${res.status}`);

  await db.insert(smsLogs).values({
    recipientName,
    recipientNumber: normalized,
    message,
    status: success ? "sent" : "failed",
    participantId,
  });

  return success;
}

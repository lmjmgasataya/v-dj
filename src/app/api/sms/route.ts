import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { smsApiKeys, smsLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isSmsSuccess } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, message, recipientName, participantId } = body;
  const endpoint = body.endpoint ?? process.env.SMS_ENDPOINT;

  let authorization: string | undefined = body.authorization ?? process.env.SMS_API_KEY;
  if (!authorization) {
    const [stored] = await db.select({ apiKey: smsApiKeys.apiKey }).from(smsApiKeys).where(eq(smsApiKeys.isDefault, true)).limit(1);
    authorization = stored?.apiKey;
  }

  if (!endpoint) {
    return NextResponse.json({ error: "No SMS endpoint configured" }, { status: 500 });
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify({ to, message }),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  await db.insert(smsLogs).values({
    recipientName: recipientName || to,
    recipientNumber: to,
    message,
    status: isSmsSuccess(res.status, text) ? "sent" : "failed",
    participantId: participantId ?? null,
  });

  return NextResponse.json(data, { status: res.status });
}

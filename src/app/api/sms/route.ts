import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { smsApiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, message } = body;
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

  return NextResponse.json(data, { status: res.status });
}

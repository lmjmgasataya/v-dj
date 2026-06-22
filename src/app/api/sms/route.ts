import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { to, message, endpoint, authorization } = await req.json();

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

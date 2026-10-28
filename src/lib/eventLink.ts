import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

const EVENT_PAGE_PATH = /^\/vg-portal\/events\/([^/?#]+)$/;

/** `callbackUrl` when it's an event registration page (/vg-portal/events/<id or share token>), else null. */
export function eventCallbackPath(callbackUrl: string | null | undefined): string | null {
  return callbackUrl && EVENT_PAGE_PATH.test(callbackUrl) ? callbackUrl : null;
}

/** The event's name when `callbackUrl` is an event registration page. */
export async function getEventNameForCallback(callbackUrl: string | null | undefined): Promise<string | null> {
  const param = callbackUrl?.match(EVENT_PAGE_PATH)?.[1];
  if (!param) return null;
  const isNumeric = /^\d+$/.test(param);
  const [event] = await db
    .select({ name: events.name })
    .from(events)
    .where(isNumeric ? eq(events.id, Number(param)) : eq(events.shareToken, param))
    .limit(1);
  return event?.name ?? null;
}

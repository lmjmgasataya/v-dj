import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEventNameForCallback } from "@/lib/eventLink";
import { ClaimForm } from "./ClaimForm";

// This is the page link previews (Messenger, Telegram, etc.) actually land on:
// deep links like /vg-portal/profile redirect here for anyone without a session,
// which is what unauthenticated preview crawlers always are.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}): Promise<Metadata> {
  const { callbackUrl } = await searchParams;

  if (callbackUrl?.startsWith("/vg-portal/profile")) {
    return {
      title: "Update Your VG Profile — Victory Iloilo",
      description: "Confirm your info, Victory Groups, and Start / Mid / End of Year update as a Victory Group Leader.",
    };
  }

  const eventName = await getEventNameForCallback(callbackUrl ?? null);
  if (eventName) {
    return {
      title: `Register for ${eventName} — Victory Iloilo`,
      description: `Log in to the VG Leader Portal to register for ${eventName}.`,
    };
  }

  return {
    title: "VG Leader Portal — Victory Iloilo",
    description: "Log in or set up your account to manage your Victory Group.",
  };
}

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await getSession();
  if (session) redirect("/");

  const [flag, eventName] = await Promise.all([
    db.select().from(featureFlags).where(eq(featureFlags.key, "vg_leader_portal")).limit(1).then((r) => r[0]),
    getEventNameForCallback(callbackUrl ?? null),
  ]);
  const enabled = flag?.enabled ?? false;

  if (!enabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-500">
            The VG leader portal isn&apos;t available right now. Please contact an admin.
          </p>
        </div>
      </div>
    );
  }

  return <ClaimForm callbackUrl={callbackUrl ?? null} eventName={eventName} />;
}

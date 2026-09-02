import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome</h2>
          <p className="mt-2 text-gray-500">Manage registrations and check-ins for Discipleship Journey</p>
        </div>
        <div className="w-full max-w-xs">
          <Link
            href="/register"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">📋</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Register</span>
            <span className="text-sm text-gray-500 text-center">Enroll a new participant</span>
          </Link>
        </div>
      </div>
    );
  }

  const eventRegistrationFlag = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, "event_registration"))
    .then((r) => r[0]);
  const showEventRegistration = eventRegistrationFlag?.enabled ?? false;

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Victory Iloilo</p>
        <h2 className="text-3xl font-bold text-gray-900 mt-1">Discipleship Database</h2>
        <p className="mt-2 text-gray-500">Choose a portal to continue</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          href="/journey"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">📋</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Discipleship Journey Portal</span>
          <span className="text-sm text-gray-500 text-center">Registration, check-ins, sessions, and reporting</span>
        </Link>
        <Link
          href="/vg-leader-portal"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">🧑‍🤝‍🧑</span>
          <span className="text-lg font-semibold text-gray-900 text-center">VG Leader Portal</span>
          <span className="text-sm text-gray-500 text-center">Victory Group leader profile and events</span>
        </Link>
        {showEventRegistration ? (
          <Link
            href="/event-registration"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">🎉</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Discipleship Events Portal</span>
            <span className="text-sm text-gray-500 text-center">Custom events: check-in and SMS reminders</span>
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 opacity-50 cursor-not-allowed select-none">
            <span className="text-4xl">🎉</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Discipleship Events Portal</span>
            <span className="text-sm text-gray-500 text-center">Coming soon</span>
          </div>
        )}
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 opacity-50 cursor-not-allowed select-none">
          <span className="text-4xl">🏛️</span>
          <span className="text-lg font-semibold text-gray-900 text-center">L113 Portal</span>
          <span className="text-sm text-gray-500 text-center">Coming soon</span>
        </div>
      </div>
    </div>
  );
}

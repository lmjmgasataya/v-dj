import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";

export default async function EventRegistrationPage() {
  const session = await getSession();
  const isDeveloper = session?.role === "developer";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Event Registration" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Event Registration</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage custom events, check-ins, and SMS reminders.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {isDeveloper && (
          <Link
            href="/event-registration/events/new"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">➕</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Create Event</span>
            <span className="text-sm text-gray-500 text-center">Set up a new custom event</span>
          </Link>
        )}
        <Link
          href="/event-registration/events"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">📋</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Event List</span>
          <span className="text-sm text-gray-500 text-center">View and manage all events</span>
        </Link>
        <Link
          href="/event-registration/check-in"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">✅</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Check In</span>
          <span className="text-sm text-gray-500 text-center">Search and record attendance</span>
        </Link>
        {isDeveloper && (
          <Link
            href="/event-registration/sms-reminder"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">📱</span>
            <span className="text-lg font-semibold text-gray-900 text-center">SMS Sender</span>
            <span className="text-sm text-gray-500 text-center">Send reminders to an event&apos;s audience</span>
          </Link>
        )}
      </div>
    </div>
  );
}

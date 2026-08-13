import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function Home() {
  const session = await getSession();
  const isDeveloper = session?.role === "developer";
  const isAdmin = !!session;

  const smsSenderFlag = isDeveloper
    ? await db.select().from(featureFlags).where(eq(featureFlags.key, "sms_sender")).then((r) => r[0])
    : null;
  const showSmsSender = smsSenderFlag?.enabled ?? false;

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Welcome</h2>
        <p className="mt-2 text-gray-500">Manage registrations and check-ins for Discipleship Journey</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-4xl">
        <Link
          href="/register"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">📋</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Register</span>
          <span className="text-sm text-gray-500 text-center">Enroll a new participant</span>
        </Link>
        {isAdmin && (
          <Link
            href="/participants"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">👥</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Participants</span>
            <span className="text-sm text-gray-500 text-center">{isDeveloper ? "View and edit all records" : "View all records"}</span>
          </Link>
        )}
        <Link
          href="/admin"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">✅</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Check-in</span>
          <span className="text-sm text-gray-500 text-center">Search and record attendance</span>
        </Link>
        <Link
          href="/sessions"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">📅</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Sessions</span>
          <span className="text-sm text-gray-500 text-center">Manage sessions and batches</span>
        </Link>
        {isAdmin && (
          <Link
            href="/report"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">📊</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Report</span>
            <span className="text-sm text-gray-500 text-center">Attendance completion matrix</span>
          </Link>
        )}
        {isDeveloper && (
          <Link
            href="/participants/print-ids"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">🪪</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Print IDs</span>
            <span className="text-sm text-gray-500 text-center">Print participant ID cards</span>
          </Link>
        )}
        {isDeveloper && (
          showSmsSender ? (
            <Link
              href="/sms-sender"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
            >
              <span className="text-4xl">📱</span>
              <span className="text-lg font-semibold text-gray-900 text-center">SMS Sender</span>
              <span className="text-sm text-gray-500 text-center">Send SMS to participants/other contacts in a batch.</span>
            </Link>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 opacity-50 cursor-not-allowed select-none">
              <span className="text-4xl">📱</span>
              <span className="text-lg font-semibold text-gray-900 text-center">SMS Sender</span>
              <span className="text-sm text-gray-500 text-center">Coming soon</span>
            </div>
          )
        )}
        {isDeveloper && (
          <Link
            href="/manage-vg-leaders"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">👤👤</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Manage VG Leaders</span>
            <span className="text-sm text-gray-500 text-center">Manage VG leaders and portal accounts</span>
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/table-management"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">🪑</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Table Management</span>
            <span className="text-sm text-gray-500 text-center">Seating assignments and capacity</span>
          </Link>
        )}
      </div>
    </div>
  );
}

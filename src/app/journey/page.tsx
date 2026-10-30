import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { batches, featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";

function formatBatchDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
}

export default async function JourneyPortalPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const isDeveloper = session.role === "developer";
  const isLeadPastor = session.role === "lead_pastor";

  const [smsSenderFlag, [defaultBatch]] = await Promise.all([
    isDeveloper
      ? db.select().from(featureFlags).where(eq(featureFlags.key, "sms_sender")).then((r) => r[0])
      : null,
    db
      .select({ name: batches.name, classStartDate: batches.classStartDate, classEndDate: batches.classEndDate })
      .from(batches)
      .where(eq(batches.isDefault, true))
      .limit(1),
  ]);
  const showSmsSender = smsSenderFlag?.enabled ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Discipleship Journey Portal" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Discipleship Journey Portal</h2>
        <p className="text-sm text-gray-500 mt-0.5">Registration, check-ins, and reporting for the discipleship classes.</p>
        {/* Lead pastors can't open /sessions/batches (see proxy.ts), so they get the note without the link. */}
        {defaultBatch ? (
          <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            Current default batch: <span className="font-semibold">{defaultBatch.name}</span>
            <span className="text-indigo-700">
              {" "}· Classes {formatBatchDate(defaultBatch.classStartDate)} – {formatBatchDate(defaultBatch.classEndDate)}
            </span>
            {!isLeadPastor && (
              <>
                {" "}·{" "}
                <Link href="/sessions/batches" className="font-medium text-indigo-700 underline hover:text-indigo-900">
                  Change default batch
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No default batch is set. Registrations, check-ins and reports won&apos;t be scoped to a batch until one is set.
            {!isLeadPastor && (
              <>
                {" "}
                <Link href="/sessions/batches" className="font-medium underline hover:text-amber-900">
                  Set a default batch
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {!isLeadPastor && (
          <Link
            href="/register"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">📋</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Register</span>
            <span className="text-sm text-gray-500 text-center">Enroll a new participant</span>
          </Link>
        )}
        <Link
          href="/participants"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">👥</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Participants</span>
          <span className="text-sm text-gray-500 text-center">{isDeveloper ? "View and edit all records" : "View all records"}</span>
        </Link>
        {!isLeadPastor && (
          <Link
            href="/admin"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">✅</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Check-in</span>
            <span className="text-sm text-gray-500 text-center">Search and record attendance</span>
          </Link>
        )}
        <Link
          href="/sessions"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">📅</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Sessions</span>
          <span className="text-sm text-gray-500 text-center">{isLeadPastor ? "View sessions" : "Manage sessions and batches"}</span>
        </Link>
        <Link
          href="/report"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">📊</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Report</span>
          <span className="text-sm text-gray-500 text-center">Attendance completion matrix</span>
        </Link>
        {!isLeadPastor && (
          <Link
            href="/table-management"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">🪑</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Table Management</span>
            <span className="text-sm text-gray-500 text-center">Seating assignments and capacity</span>
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
        {isDeveloper &&
          (showSmsSender ? (
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
          ))}
      </div>
    </div>
  );
}

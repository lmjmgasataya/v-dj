import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";

export default async function VgLeaderPortalPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const isDeveloper = session.role === "developer";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal" }]} />
        <h2 className="text-2xl font-bold text-gray-900">VG Leader Portal</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage Victory Group leaders and their portal accounts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isDeveloper && (
          <>
            <Link
              href="/manage-vg-leaders/leaders"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
            >
              <span className="text-4xl">👤👤</span>
              <span className="text-lg font-semibold text-gray-900 text-center">VG Leaders</span>
              <span className="text-sm text-gray-500 text-center">Manage VG leaders and portal accounts</span>
            </Link>
            <Link
              href="/manage-vg-leaders/report"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
            >
              <span className="text-4xl">📊</span>
              <span className="text-lg font-semibold text-gray-900 text-center">VG Leaders Report</span>
              <span className="text-sm text-gray-500 text-center">Demographics and stats for claimed VG leaders</span>
            </Link>
            <Link
              href="/manage-vg-leaders/vg-report"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
            >
              <span className="text-4xl">📈</span>
              <span className="text-lg font-semibold text-gray-900 text-center">Victory Group Report</span>
              <span className="text-sm text-gray-500 text-center">Victory Group schedules and membership breakdown</span>
            </Link>
            <Link
              href="/manage-vg-leaders/quarterly-report"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
            >
              <span className="text-4xl">🗓️</span>
              <span className="text-lg font-semibold text-gray-900 text-center">Quarterly Report</span>
              <span className="text-sm text-gray-500 text-center">Quarterly snapshots and convergence attendance</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { ACCEPT_PREVIOUS_QUARTER_FLAG, CARRY_OVER_PREVIOUS_QUARTER_FLAG } from "@/lib/vgQuarters";
import { getQuarterOptions } from "@/lib/vgQuarterFlags";
import { PortalSettingsButton, type PortalSetting } from "./PortalSettingsButton";

export default async function VgLeaderPortalPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const isDeveloper = session.role === "developer";
  const canViewReports = isDeveloper || session.role === "lead_pastor";

  const quarterOptions = isDeveloper ? await getQuarterOptions() : null;
  const settings: PortalSetting[] = quarterOptions
    ? [
        {
          key: ACCEPT_PREVIOUS_QUARTER_FLAG,
          title: "Still accepting responses for previous quarter",
          description:
            "VG leaders can still open the quarter that just ended — e.g. Q3 during October. An update made now counts for both that quarter and the current one.",
          enabled: quarterOptions.acceptPreviousQuarter,
        },
        {
          key: CARRY_OVER_PREVIOUS_QUARTER_FLAG,
          title: "Carry over previous quarter's responses",
          description:
            "Leaders who updated during the previous quarter count as updated for the current one too — e.g. a Q3 update counts for Q4, so they don't need to update again.",
          enabled: quarterOptions.carryOverPreviousQuarter,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal" }]} />
          <h2 className="text-2xl font-bold text-gray-900">VG Leader Portal</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage Victory Group leaders and their portal accounts.</p>
        </div>
        {isDeveloper && <PortalSettingsButton settings={settings} />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isDeveloper && (
          <Link
            href="/vg-leader-portal/leaders"
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">👤👤</span>
            <span className="text-lg font-semibold text-gray-900 text-center">VG Leaders</span>
            <span className="text-sm text-gray-500 text-center">Manage VG leaders and portal accounts</span>
          </Link>
        )}
        {canViewReports && (
          <>
            <Link
              href="/vg-leader-portal/vgl-report"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
            >
              <span className="text-4xl">📊</span>
              <span className="text-lg font-semibold text-gray-900 text-center">VG Leaders Report</span>
              <span className="text-sm text-gray-500 text-center">Demographics and stats for claimed VG leaders</span>
            </Link>
            <Link
              href="/vg-leader-portal/vg-report"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
            >
              <span className="text-4xl">📈</span>
              <span className="text-lg font-semibold text-gray-900 text-center">Victory Group Report</span>
              <span className="text-sm text-gray-500 text-center">Victory Group schedules and membership breakdown</span>
            </Link>
            <Link
              href="/vg-leader-portal/quarterly-report"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
            >
              <span className="text-4xl">🗓️</span>
              <span className="text-lg font-semibold text-gray-900 text-center">Quarterly Report</span>
              <span className="text-sm text-gray-500 text-center">Quarterly snapshots and convergence attendance</span>
            </Link>
            <Link
              href="/vg-leader-portal/discipleship-journey-report"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
            >
              <span className="text-4xl">✅</span>
              <span className="text-lg font-semibold text-gray-900 text-center">Discipleship Journey Report</span>
              <span className="text-sm text-gray-500 text-center">Journey steps completed per claimed VG leader</span>
            </Link>
          </>
        )}
        {isDeveloper && (
          <Link
            href="/vg-leader-portal/graph"
            className="relative flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="absolute top-3 right-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
              Beta
            </span>
            <span className="text-4xl">🕸️</span>
            <span className="text-lg font-semibold text-gray-900 text-center">Connections Graph</span>
            <span className="text-sm text-gray-500 text-center">Zoomable map of VG leaders and who they&apos;re connected to</span>
          </Link>
        )}
      </div>
    </div>
  );
}

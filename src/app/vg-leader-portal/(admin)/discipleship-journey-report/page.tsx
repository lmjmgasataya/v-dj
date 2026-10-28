import Link from "next/link";
import { DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DiscipleshipJourneyTable } from "./DiscipleshipJourneyTable";
import { getDiscipleshipJourneyRows } from "./journeyRows";
import { getAutoJourneyLinks } from "@/lib/djPortalJourney";
import { rawServiceValues } from "@/lib/timeService";

export default async function DiscipleshipJourneyReportPage() {
  const authSession = await getSession();
  const lockedServiceRawValues =
    authSession?.role === "lead_pastor" ? rawServiceValues(authSession.timeService) : undefined;
  const [rows, autoLinks] = await Promise.all([
    getDiscipleshipJourneyRows(authSession),
    getAutoJourneyLinks({ serviceRawValues: lockedServiceRawValues }),
  ]);
  const autoAdded = autoLinks.filter((l) => !l.wasAlreadyChecked).length;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "VG Leader Portal", href: "/vg-leader-portal" },
          { label: "Discipleship Journey Report" },
        ]}
      />
      <p className="text-sm text-gray-500 -mt-2">{rows.length} VG leader{rows.length !== 1 ? "s" : ""} with a claimed portal account</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Discipleship Journey Steps Completed</h3>
            <p className="text-xs text-gray-400 mt-0.5">Which Discipleship Journey steps each claimed VG leader has completed, and whether they graduated from Leadership 113.</p>
          </div>
          {rows.length > 0 && (
            <a
              href="/vg-leader-portal/discipleship-journey-report/export"
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              ⬇ Download Excel
            </a>
          )}
        </div>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <DiscipleshipJourneyTable rows={rows} steps={DISCIPLESHIP_JOURNEY_STEPS} />
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">No claimed VG leaders found.</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Marked from the Discipleship Journey Portal ({autoLinks.length})</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            VG leaders who completed Spiritual Foundations or Empowering Leaders in the Discipleship Journey Portal.
            {" "}{autoAdded} checked automatically · {autoLinks.length - autoAdded} had already checked it themselves.
          </p>
        </div>
        {autoLinks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Service</th>
                  <th className="px-4 py-2 text-left font-medium">Step</th>
                  <th className="px-4 py-2 text-left font-medium">From</th>
                  <th className="px-4 py-2 text-left font-medium">Result</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {autoLinks.map((l) => (
                  <tr key={`${l.vgLeaderId}-${l.step}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                      <Link href={`/vg-leader-portal/leaders/${l.vgLeaderId}`} className="text-indigo-600 hover:text-indigo-800 underline">
                        {l.leaderName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{l.service || "Not Set"}</td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{l.step}</td>
                    <td className="px-4 py-2.5 text-gray-500">{l.source}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {l.wasAlreadyChecked ? (
                        <span className="text-gray-500">Already checked</span>
                      ) : (
                        <span className="text-green-600 font-semibold">Checked automatically</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {l.linkedAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">
            Nothing yet — this fills in after check-ins and the nightly sync.
          </p>
        )}
      </div>
    </div>
  );
}

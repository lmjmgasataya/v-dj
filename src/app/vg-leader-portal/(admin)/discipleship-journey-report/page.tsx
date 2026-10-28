import { AUTO_JOURNEY_STEPS, DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DiscipleshipJourneyTable } from "./DiscipleshipJourneyTable";
import { AutoJourneyLinksTable } from "./AutoJourneyLinksTable";
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
          <AutoJourneyLinksTable links={autoLinks} steps={AUTO_JOURNEY_STEPS} />
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">
            Nothing yet — this fills in after check-ins and the nightly sync.
          </p>
        )}
      </div>
    </div>
  );
}

import { DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DiscipleshipJourneyTable } from "./DiscipleshipJourneyTable";
import { getDiscipleshipJourneyRows } from "./journeyRows";

export default async function DiscipleshipJourneyReportPage() {
  const authSession = await getSession();
  const rows = await getDiscipleshipJourneyRows(authSession);

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
    </div>
  );
}

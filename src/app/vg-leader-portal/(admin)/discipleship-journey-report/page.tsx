import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { and, isNull, inArray } from "drizzle-orm";
import { DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { rawServiceValues } from "@/lib/timeService";
import { DiscipleshipJourneyTable } from "./DiscipleshipJourneyTable";

export default async function DiscipleshipJourneyReportPage() {
  const authSession = await getSession();
  const lockedServiceRawValues =
    authSession?.role === "lead_pastor" ? rawServiceValues(authSession?.timeService) : undefined;

  const leaders = await db
    .select()
    .from(victoryGroupLeaders)
    .where(
      and(
        isNull(victoryGroupLeaders.deletedAt),
        lockedServiceRawValues ? inArray(victoryGroupLeaders.serviceAttending, lockedServiceRawValues) : undefined
      )
    );

  const rows = leaders
    .map((l) => {
      const completed = new Set((l.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean));
      return {
        id: l.id,
        name: `${l.lastName}, ${l.firstName}`,
        steps: Object.fromEntries(DISCIPLESHIP_JOURNEY_STEPS.map((step) => [step, completed.has(step)])) as Record<
          (typeof DISCIPLESHIP_JOURNEY_STEPS)[number],
          boolean
        >,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "VG Leader Portal", href: "/vg-leader-portal" },
          { label: "Discipleship Journey Report" },
        ]}
      />
      <p className="text-sm text-gray-500 -mt-2">{rows.length} VG leader{rows.length !== 1 ? "s" : ""}</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Discipleship Journey Steps Completed</h3>
          <p className="text-xs text-gray-400 mt-0.5">Which Discipleship Journey steps each VG leader has completed.</p>
        </div>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <DiscipleshipJourneyTable rows={rows} steps={DISCIPLESHIP_JOURNEY_STEPS} />
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">No VG leaders found.</p>
        )}
      </div>
    </div>
  );
}

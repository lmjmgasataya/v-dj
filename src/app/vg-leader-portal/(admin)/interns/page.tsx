import { db } from "@/db";
import { interns, victoryGroups, victoryGroupLeaders } from "@/db/schema";
import { and, isNull, eq } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InternsTable } from "./InternsTable";

export default async function InternsPage() {
  const rows = await db
    .select({
      id: interns.id,
      lastName: interns.lastName,
      firstName: interns.firstName,
      place: victoryGroups.place,
      day: victoryGroups.day,
      time: victoryGroups.time,
      leaderLastName: victoryGroupLeaders.lastName,
      leaderFirstName: victoryGroupLeaders.firstName,
      serviceAttending: victoryGroupLeaders.serviceAttending,
    })
    .from(interns)
    .innerJoin(victoryGroups, eq(interns.victoryGroupId, victoryGroups.id))
    .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
    .where(and(isNull(victoryGroups.deletedAt), isNull(interns.deletedAt)))
    .orderBy(interns.lastName, interns.firstName);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal", href: "/vg-leader-portal" }, { label: "Interns" }]} />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Interns</h3>
          <span className="text-xs text-gray-400">{rows.length} intern{rows.length !== 1 ? "s" : ""}</span>
        </div>
        <InternsTable rows={rows} />
      </div>
    </div>
  );
}

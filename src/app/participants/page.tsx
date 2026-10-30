import { Suspense } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { ParticipantList, ParticipantListSkeleton } from "./ParticipantList";
import { ParticipantFilters } from "./ParticipantFilters";
import { rawServiceValues } from "@/lib/timeService";
import { db } from "@/db";
import { batches } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; lifestage?: string; fee?: string; gender?: string; service?: string; previousChurch?: string; waterBaptism?: string; victoryWeekend?: string; batch?: string }>;
}) {
  const [{ q = "", page: pageParam, lifestage = "", fee = "", gender = "", service = "", previousChurch = "", waterBaptism = "", victoryWeekend = "", batch: batchParam }, session, allBatches] = await Promise.all([
    searchParams,
    getSession(),
    db.select({ id: batches.id, name: batches.name, isDefault: batches.isDefault }).from(batches).orderBy(desc(batches.classStartDate)),
  ]);
  const isDeveloper = session?.role === "developer";
  const isLeadPastor = session?.role === "lead_pastor";
  const lockedServiceRawValues = isLeadPastor ? rawServiceValues(session?.timeService) : undefined;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  // No ?batch= shows the active (default) batch; ?batch=all shows every batch.
  const defaultBatchId = (allBatches.find((b) => b.isDefault) ?? allBatches[0])?.id ?? null;
  const batchId = batchParam === "all" ? null : (parseInt(batchParam ?? "", 10) || defaultBatchId);
  const batch = batchId == null ? "all" : String(batchId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Discipleship Journey Portal", href: "/journey" }, { label: "Participants" }]} />
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <div className="flex items-center gap-3">
            {isDeveloper && (
              <Link
                href="/participants/print-ids"
                className="flex items-center gap-1.5 bg-[#00428E] hover:bg-[#003578] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                Print IDs
              </Link>
            )}
            <a
              href={`/api/participants/export?batch=${batch}`}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <span>↓</span> Export Excel
            </a>
            {!isLeadPastor && (
              <Link href="/participants/deleted" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">View deleted</Link>
            )}
          </div>
        </div>
      </div>

      <ParticipantFilters
        key={`${q}-${lifestage}-${fee}-${gender}-${service}-${previousChurch}-${waterBaptism}-${victoryWeekend}-${batch}`}
        q={q}
        lifestage={lifestage}
        fee={fee}
        gender={gender}
        service={service}
        previousChurch={previousChurch}
        waterBaptism={waterBaptism}
        victoryWeekend={victoryWeekend}
        batch={batch}
        batches={allBatches}
        hideServiceFilter={isLeadPastor}
      />

      <Suspense key={`${q}-${lifestage}-${fee}-${gender}-${service}-${previousChurch}-${waterBaptism}-${victoryWeekend}-${batch}-${page}`} fallback={<ParticipantListSkeleton />}>
        <ParticipantList q={q} lifestage={lifestage} fee={fee} gender={gender} service={service} previousChurch={previousChurch} waterBaptism={waterBaptism} victoryWeekend={victoryWeekend} batchId={batchId} page={page} isDeveloper={isDeveloper} canViewLeaders={isDeveloper || isLeadPastor} lockedServiceRawValues={lockedServiceRawValues} />
      </Suspense>
    </div>
  );
}

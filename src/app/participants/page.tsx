import { Suspense } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { ParticipantList, ParticipantListSkeleton } from "./ParticipantList";
import { ParticipantFilters } from "./ParticipantFilters";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; lifestage?: string; fee?: string; gender?: string; service?: string; previousChurch?: string; waterBaptism?: string; victoryWeekend?: string }>;
}) {
  const [{ q = "", page: pageParam, lifestage = "", fee = "", gender = "", service = "", previousChurch = "", waterBaptism = "", victoryWeekend = "" }, session] = await Promise.all([searchParams, getSession()]);
  const isDeveloper = session?.role === "developer";
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

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
              href="/api/participants/export"
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <span>↓</span> Export Excel
            </a>
            <Link href="/participants/deleted" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">View deleted</Link>
          </div>
        </div>
      </div>

      <ParticipantFilters
        key={`${q}-${lifestage}-${fee}-${gender}-${service}-${previousChurch}-${waterBaptism}-${victoryWeekend}`}
        q={q}
        lifestage={lifestage}
        fee={fee}
        gender={gender}
        service={service}
        previousChurch={previousChurch}
        waterBaptism={waterBaptism}
        victoryWeekend={victoryWeekend}
      />

      <Suspense key={`${q}-${lifestage}-${fee}-${gender}-${service}-${previousChurch}-${waterBaptism}-${victoryWeekend}-${page}`} fallback={<ParticipantListSkeleton />}>
        <ParticipantList q={q} lifestage={lifestage} fee={fee} gender={gender} service={service} previousChurch={previousChurch} waterBaptism={waterBaptism} victoryWeekend={victoryWeekend} page={page} isDeveloper={isDeveloper} />
      </Suspense>
    </div>
  );
}

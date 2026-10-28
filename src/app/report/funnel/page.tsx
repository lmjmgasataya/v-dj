import { Suspense } from "react";
import { db } from "@/db";
import { batches } from "@/db/schema";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BatchPicker } from "@/components/BatchPicker";
import { rawServiceValues } from "@/lib/timeService";
import { FunnelResults } from "./FunnelResults";
import { FunnelResultsSkeleton } from "./FunnelResultsSkeleton";

type FunnelParams = { batch?: string; waterBaptism?: string; orientation?: string };

function ExcludeToggle({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
        active ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
          active ? "border-indigo-500 bg-indigo-500 text-white" : "border-gray-300 bg-white"
        }`}
      >
        {active ? "✓" : ""}
      </span>
      {label}
    </Link>
  );
}

export default async function FunnelReportPage({
  searchParams,
}: {
  searchParams: Promise<FunnelParams>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");
  const lockedServiceRawValues =
    authSession.role === "lead_pastor" ? rawServiceValues(authSession.timeService) : undefined;

  const params = await searchParams;
  const excludeWaterBaptism = params.waterBaptism === "exclude";
  const excludeOrientation = params.orientation === "exclude";

  const allBatches = await db
    .select({ id: batches.id, name: batches.name, isDefault: batches.isDefault })
    .from(batches)
    .orderBy(batches.createdAt);

  const defaultBatch = allBatches.find((b) => b.isDefault) ?? allBatches[0] ?? null;
  const selectedBatchId = params.batch ? parseInt(params.batch, 10) : (defaultBatch?.id ?? null);
  const selectedBatch = allBatches.find((b) => b.id === selectedBatchId) ?? null;

  // Flips one exclude filter, keeping the others.
  function toggleHref(key: "waterBaptism" | "orientation") {
    const next = new URLSearchParams();
    if (params.batch) next.set("batch", params.batch);
    for (const k of ["waterBaptism", "orientation"] as const) {
      const on = params[k] === "exclude";
      if (k === key ? !on : on) next.set(k, "exclude");
    }
    const qs = next.toString();
    return `/report/funnel${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Discipleship Journey Portal", href: "/journey" },
            { label: "Reports", href: "/report" },
            { label: "Completion Funnel" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Completion Funnel</h2>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <BatchPicker batches={allBatches} selectedId={selectedBatchId} />
        <ExcludeToggle href={toggleHref("orientation")} active={excludeOrientation} label="Exclude Orientation" />
        <ExcludeToggle href={toggleHref("waterBaptism")} active={excludeWaterBaptism} label="Exclude Water Baptism" />
      </div>

      {selectedBatch ? (
        // Keyed on the filters so changing one shows the skeleton instead of the stale chart.
        <Suspense
          key={`${selectedBatch.id}-${excludeWaterBaptism}-${excludeOrientation}`}
          fallback={<FunnelResultsSkeleton />}
        >
          <FunnelResults
            batchId={selectedBatch.id}
            batchName={selectedBatch.name}
            excludeWaterBaptism={excludeWaterBaptism}
            excludeOrientation={excludeOrientation}
            lockedServiceRawValues={lockedServiceRawValues}
          />
        </Suspense>
      ) : (
        <p className="text-sm text-gray-400">No batch selected.</p>
      )}
    </div>
  );
}

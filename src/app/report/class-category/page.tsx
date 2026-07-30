import { db } from "@/db";
import { participants, batches } from "@/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FEE_CATEGORIES } from "@/components/form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClassCategoryChart } from "./ClassCategoryChart";
import { BatchPicker } from "@/components/BatchPicker";

export default async function ClassCategoryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");

  const { batch: batchParam } = await searchParams;

  const allBatches = await db
    .select({ id: batches.id, name: batches.name, isDefault: batches.isDefault })
    .from(batches)
    .orderBy(batches.createdAt);

  const defaultBatch = allBatches.find((b) => b.isDefault) ?? allBatches[0] ?? null;
  const selectedBatchId = batchParam ? parseInt(batchParam, 10) : (defaultBatch?.id ?? null);
  const selectedBatch = allBatches.find((b) => b.id === selectedBatchId) ?? null;

  const breakdown =
    selectedBatchId !== null
      ? await db
          .select({ fee: participants.registrationFee, count: count() })
          .from(participants)
          .where(
            and(
              isNull(participants.deletedAt),
              eq(participants.isWalkIn, false),
              eq(participants.batchId, selectedBatchId)
            )
          )
          .groupBy(participants.registrationFee)
          .orderBy(participants.registrationFee)
      : [];

  const total = breakdown.reduce((s, r) => s + r.count, 0);

  const rows = FEE_CATEGORIES.map((cat) => {
    const found = breakdown.find((r) => r.fee === cat.value);
    const participantCount = found?.count ?? 0;
    const amountNum = parseInt(cat.amount.replace(/[^\d]/g, ""), 10);
    return {
      ...cat,
      count: participantCount,
      revenue: participantCount * amountNum,
    };
  });

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  const chartData = rows.map((r) => ({
    label: `Class ${r.value}`,
    count: r.count,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Reports", href: "/report" },
            { label: "Class Category" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Class Category</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} participant{total !== 1 ? "s" : ""} in {selectedBatch?.name ?? "—"}
        </p>
      </div>

      <BatchPicker batches={allBatches} selectedId={selectedBatchId} />

      <div className="grid grid-cols-2 gap-4">
        {rows.map((r) => (
          <div key={r.value} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Class {r.value}
              </p>
              <span className="text-xs text-gray-400">{r.amount}</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{r.count}</p>
            <p className="text-xs text-gray-500">{r.description}</p>
            <p className="text-sm font-semibold text-gray-700 mt-1">
              ₱{r.revenue.toLocaleString()}
              {total > 0 && (
                <span className="text-xs font-normal text-gray-400 ml-1.5">
                  ({Math.round((r.count / total) * 100)}%)
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-700">Participants per category</p>
          <p className="text-sm text-gray-500">
            Overall total collected: <span className="font-semibold text-gray-800">₱{totalRevenue.toLocaleString()}</span>
          </p>
        </div>
        <ClassCategoryChart data={chartData} />
      </div>
    </div>
  );
}

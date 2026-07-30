import { db } from "@/db";
import { participants, batches } from "@/db/schema";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RegistrationsChart, type DayBreakdown } from "./RegistrationsChart";
import { ServiceChart, type ServiceCount } from "./ServiceChart";
import { VictoryWeekendChart } from "./VictoryWeekendChart";
import { BatchPicker } from "@/components/BatchPicker";
import { SERVICE_OPTIONS } from "@/components/form";
import { ServiceDatePicker } from "./ServiceDatePicker";

const FEE_AMOUNTS: Record<string, number> = { A: 1200, B: 900, C: 900, D: 700 };

export default async function RegistrationsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; service_date?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");

  const { batch: batchParam, service_date: serviceDateParam } = await searchParams;

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
          .select({
            date: sql<string>`DATE(${participants.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
            fee: participants.registrationFee,
            count: count(),
          })
          .from(participants)
          .where(
            and(
              isNull(participants.deletedAt),
              eq(participants.isWalkIn, false),
              eq(participants.batchId, selectedBatchId)
            )
          )
          .groupBy(
            sql`DATE(${participants.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
            participants.registrationFee
          )
          .orderBy(sql`DATE(${participants.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`)
      : [];

  // Pivot into per-day objects
  const dayMap = new Map<string, DayBreakdown>();
  for (const row of breakdown) {
    if (!dayMap.has(row.date)) {
      const label = new Date(row.date + "T00:00:00").toLocaleDateString("en-PH", {
        month: "short", day: "numeric", timeZone: "Asia/Manila",
      });
      dayMap.set(row.date, { date: label, A: 0, B: 0, C: 0, D: 0 });
    }
    const entry = dayMap.get(row.date)!;
    const fee = row.fee as string;
    if (fee === "A" || fee === "B" || fee === "C" || fee === "D") {
      entry[fee] += row.count;
    }
  }

  const chartData = Array.from(dayMap.values());

  // Date options for the service chart filter (only dates with registrations)
  const serviceDateOptions = Array.from(dayMap.keys()).map((raw) => ({
    value: raw,
    label: new Date(raw + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short", day: "numeric", timeZone: "Asia/Manila",
    }),
  }));
  const selectedServiceDate = serviceDateOptions.some((d) => d.value === serviceDateParam)
    ? serviceDateParam!
    : null;

  // Service breakdown
  const serviceRows =
    selectedBatchId !== null
      ? await db
          .select({
            service: sql<string>`COALESCE(${participants.worshipServiceRegistered}, 'Not specified')`,
            count: count(),
          })
          .from(participants)
          .where(
            and(
              isNull(participants.deletedAt),
              eq(participants.isWalkIn, false),
              eq(participants.batchId, selectedBatchId),
              selectedServiceDate
                ? sql`DATE(${participants.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') = ${selectedServiceDate}`
                : undefined
            )
          )
          .groupBy(sql`COALESCE(${participants.worshipServiceRegistered}, 'Not specified')`)
      : [];

  const serviceCountMap = new Map(serviceRows.map((r) => [r.service, Number(r.count)]));
  const serviceData: ServiceCount[] = [
    ...SERVICE_OPTIONS.map((s) => ({ service: s, count: serviceCountMap.get(s) ?? 0 })),
    ...(serviceCountMap.has("Not specified") ? [{ service: "Not specified", count: serviceCountMap.get("Not specified")! }] : []),
  ];

  // Victory Weekend / Victory Day status
  const victoryRows =
    selectedBatchId !== null
      ? await db
          .select({
            status: sql<string>`CASE WHEN ${participants.isDoneWithVictoryWeekend} = true OR ${participants.victoryDate} IS NOT NULL THEN 'done' ELSE 'not_done' END`,
            count: count(),
          })
          .from(participants)
          .where(
            and(
              isNull(participants.deletedAt),
              eq(participants.isWalkIn, false),
              eq(participants.batchId, selectedBatchId)
            )
          )
          .groupBy(
            sql`CASE WHEN ${participants.isDoneWithVictoryWeekend} = true OR ${participants.victoryDate} IS NOT NULL THEN 'done' ELSE 'not_done' END`
          )
      : [];

  const victoryDone = Number(victoryRows.find((r) => r.status === "done")?.count ?? 0);
  const victoryNotDone = Number(victoryRows.find((r) => r.status === "not_done")?.count ?? 0);

  const totals = { A: 0, B: 0, C: 0, D: 0 };
  for (const d of chartData) {
    totals.A += d.A;
    totals.B += d.B;
    totals.C += d.C;
    totals.D += d.D;
  }
  const totalRegistered = totals.A + totals.B + totals.C + totals.D;
  const totalAmount = totals.A * FEE_AMOUNTS.A + totals.B * FEE_AMOUNTS.B + totals.C * FEE_AMOUNTS.C + totals.D * FEE_AMOUNTS.D;
  const peak = chartData.reduce((max, d) => Math.max(max, d.A + d.B + d.C + d.D), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Reports", href: "/report" }, { label: "Registrations" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Registrations</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Daily sign-ups for {selectedBatch?.name ?? "—"}
        </p>
      </div>

      <BatchPicker batches={allBatches} selectedId={selectedBatchId} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Registered", value: totalRegistered.toString() },
          { label: "Registration Days", value: chartData.length.toString() },
          { label: "Peak in a Day", value: peak.toString() },
          { label: "Total Collected", value: `₱${totalAmount.toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Registrations per day by class</p>
        <RegistrationsChart data={chartData} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-700">Registrations per worship service</p>
          <ServiceDatePicker
            dates={serviceDateOptions}
            selected={selectedServiceDate}
            batchId={selectedBatchId}
          />
        </div>
        <ServiceChart data={serviceData} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Victory Weekend / Victory Day status</p>
        <VictoryWeekendChart done={victoryDone} notDone={victoryNotDone} />
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right text-indigo-600">A</th>
                <th className="px-4 py-3 text-right text-purple-600">B</th>
                <th className="px-4 py-3 text-right text-sky-600">C</th>
                <th className="px-4 py-3 text-right text-emerald-600">D</th>
                <th className="px-4 py-3 text-right text-gray-700">Total</th>
                <th className="px-4 py-3 text-right text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {chartData.map((d) => {
                const dayTotal = d.A + d.B + d.C + d.D;
                const dayAmount = d.A * FEE_AMOUNTS.A + d.B * FEE_AMOUNTS.B + d.C * FEE_AMOUNTS.C + d.D * FEE_AMOUNTS.D;
                return (
                  <tr key={d.date} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{d.date}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{d.A || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{d.B || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{d.C || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{d.D || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{dayTotal}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-indigo-600">₱{dayAmount.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 font-semibold text-gray-800">
                <td className="px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Total</td>
                <td className="px-4 py-3 text-right text-indigo-600">{totals.A}</td>
                <td className="px-4 py-3 text-right text-purple-600">{totals.B}</td>
                <td className="px-4 py-3 text-right text-sky-600">{totals.C}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{totals.D}</td>
                <td className="px-4 py-3 text-right">{totalRegistered}</td>
                <td className="px-4 py-3 text-right text-indigo-600">₱{totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

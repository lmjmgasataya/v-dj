import { db } from "@/db";
import { participants } from "@/db/schema";
import { isNull, and, gte, lt } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { todayPH } from "@/lib/date";
import { FEE_CATEGORIES, SERVICE_OPTIONS } from "@/components/form";
import { DatePicker } from "./DatePicker";
import { Fragment } from "react";

const CAT_W = 250;
const FEE_W = 80;
const SVC_QTY_W = 80;
const SVC_AMT_W = 100;
const GRAND_QTY_W = 80;
const GRAND_AMT_W = 110;

export default async function CollectionMonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { date: dateParam } = await searchParams;
  const date = dateParam ?? todayPH();

  const startUtc = new Date(`${date}T00:00:00+08:00`);
  const endUtc = new Date(startUtc.getTime() + 86_400_000);

  const rows = await db
    .select({
      registrationFee: participants.registrationFee,
      worshipServiceRegistered: participants.worshipServiceRegistered,
    })
    .from(participants)
    .where(
      and(
        isNull(participants.deletedAt),
        gte(participants.createdAt, startUtc),
        lt(participants.createdAt, endUtc),
      )
    );

  // Build pivot: service → feeCategory → count
  const pivot: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const svc = row.worshipServiceRegistered ?? "Not Specified";
    const fee = row.registrationFee ?? "Unknown";
    pivot[svc] ??= {};
    pivot[svc][fee] = (pivot[svc][fee] ?? 0) + 1;
  }

  const knownServices = SERVICE_OPTIONS as unknown as string[];
  const hasAnyData = Object.keys(pivot).length > 0;
  // Show all known services only if there's at least one registration; append unknown ones from data
  const activeServices = hasAnyData
    ? [
        ...knownServices,
        ...Object.keys(pivot).filter((s) => !knownServices.includes(s)),
      ]
    : [];

  const catRows = FEE_CATEGORIES.map((cat) => {
    const unitAmount = parseInt(cat.amount.replace(/[^\d]/g, ""), 10);
    const totalQty = activeServices.reduce(
      (sum, svc) => sum + (pivot[svc]?.[cat.value] ?? 0),
      0
    );
    return { ...cat, unitAmount, totalQty, totalAmount: totalQty * unitAmount };
  });

  const serviceTotals = Object.fromEntries(
    activeServices.map((svc) => {
      let qty = 0;
      let amount = 0;
      for (const cat of catRows) {
        const q = pivot[svc]?.[cat.value] ?? 0;
        qty += q;
        amount += q * cat.unitAmount;
      }
      return [svc, { qty, amount }];
    })
  );

  const grandTotalQty = catRows.reduce((sum, c) => sum + c.totalQty, 0);
  const grandTotalAmount = catRows.reduce((sum, c) => sum + c.totalAmount, 0);

  const formattedDate = new Date(`${date}T00:00:00+08:00`).toLocaleDateString(
    "en-PH",
    { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Reports", href: "/report" },
            { label: "Collection Monitoring" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900 mt-1">
          Collection Monitoring
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {rows.length} registration{rows.length !== 1 ? "s" : ""} ·{" "}
          {formattedDate}
        </p>
      </div>

      <DatePicker date={date}>
      {activeServices.length === 0 ? (
        <p className="text-sm text-gray-400">No registrations on {formattedDate}.</p>
      ) : (
      <div className="rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="text-sm"
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                tableLayout: "fixed",
                width:
                  CAT_W +
                  FEE_W +
                  activeServices.length * (SVC_QTY_W + SVC_AMT_W) +
                  GRAND_QTY_W +
                  GRAND_AMT_W,
              }}
            >
              <colgroup>
                <col style={{ width: CAT_W }} />
                <col style={{ width: FEE_W }} />
                {activeServices.flatMap((_, i) => [
                  <col key={`${i}-qty`} style={{ width: SVC_QTY_W }} />,
                  <col key={`${i}-amt`} style={{ width: SVC_AMT_W }} />,
                ])}
                <col style={{ width: GRAND_QTY_W }} />
                <col style={{ width: GRAND_AMT_W }} />
              </colgroup>
              <thead>
                {/* Row 1: service group headers */}
                <tr>
                  <th
                    rowSpan={2}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b-2 border-r border-gray-200"
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 20,
                      background: "#F9FAFB",
                    }}
                  >
                    Category
                  </th>
                  <th
                    rowSpan={2}
                    className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b-2 border-r-2 border-gray-300"
                    style={{
                      position: "sticky",
                      left: CAT_W,
                      zIndex: 20,
                      background: "#F9FAFB",
                    }}
                  >
                    Unit Fee
                  </th>
                  {activeServices.map((svc) => (
                    <th
                      key={svc}
                      colSpan={2}
                      className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap border-b border-l border-r border-gray-200"
                      style={{ background: "#F9FAFB" }}
                    >
                      {svc}
                    </th>
                  ))}
                  <th
                    colSpan={2}
                    className="px-4 py-2 text-center text-xs font-bold text-indigo-700 uppercase tracking-wide whitespace-nowrap border-b border-l-2 border-indigo-200"
                    style={{ background: "#EEF2FF" }}
                  >
                    Grand Total
                  </th>
                </tr>
                {/* Row 2: qty / amount sub-headers */}
                <tr>
                  {activeServices.map((svc) => (
                    <Fragment key={svc}>
                      <th
                        className="px-3 py-2 text-center text-[11px] font-medium text-gray-500 whitespace-nowrap border-b-2 border-l border-gray-200"
                        style={{ background: "#F9FAFB", minWidth: 80 }}
                      >
                        Qty (pcs)
                      </th>
                      <th
                        className="px-3 py-2 text-center text-[11px] font-medium text-gray-500 whitespace-nowrap border-b-2 border-r border-gray-200"
                        style={{ background: "#F9FAFB", minWidth: 100 }}
                      >
                        Amount (₱)
                      </th>
                    </Fragment>
                  ))}
                  <th
                    className="px-3 py-2 text-center text-[11px] font-semibold text-indigo-600 whitespace-nowrap border-b-2 border-l-2 border-indigo-200"
                    style={{ background: "#EEF2FF", minWidth: 80 }}
                  >
                    Qty (pcs)
                  </th>
                  <th
                    className="px-3 py-2 text-center text-[11px] font-semibold text-indigo-600 whitespace-nowrap border-b-2"
                    style={{ background: "#EEF2FF", minWidth: 110 }}
                  >
                    Amount (₱)
                  </th>
                </tr>
              </thead>

              <tbody>
                {catRows.map((cat, i) => {
                  const rowBg = i % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
                  return (
                    <tr key={cat.value}>
                      <td
                        className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap border-b border-r border-gray-100"
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 10,
                          background: rowBg,
                        }}
                      >
                        <span className="font-bold">{cat.value}</span>
                        <span className="text-gray-500 font-normal">
                          {" "}
                          —{" "}
                          {cat.description
                            .split(/(with(?:out)?)/i)
                            .map((part, i) =>
                              /^with(?:out)?$/i.test(part) ? (
                                <strong key={i} className="font-bold text-gray-700">{part}</strong>
                              ) : (
                                part
                              )
                            )}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-right text-gray-700 whitespace-nowrap border-b border-r-2 border-gray-300 tabular-nums font-medium"
                        style={{
                          position: "sticky",
                          left: CAT_W,
                          zIndex: 10,
                          background: rowBg,
                        }}
                      >
                        {cat.amount}
                      </td>
                      {activeServices.map((svc) => {
                        const qty = pivot[svc]?.[cat.value] ?? 0;
                        return (
                          <Fragment key={svc}>
                            <td className="px-3 py-3 text-center text-gray-700 border-b border-l border-gray-100 tabular-nums">
                              {qty > 0 ? (
                                qty
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-700 border-b border-r border-gray-100 tabular-nums">
                              {qty > 0 ? (
                                (qty * cat.unitAmount).toLocaleString()
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </Fragment>
                        );
                      })}
                      <td
                        className="px-3 py-3 text-center font-semibold text-gray-900 border-b border-l-2 border-indigo-200 tabular-nums"
                        style={{ background: "#EEF2FF" }}
                      >
                        {cat.totalQty > 0 ? (
                          cat.totalQty
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td
                        className="px-3 py-3 text-center font-semibold text-gray-900 border-b tabular-nums"
                        style={{ background: "#EEF2FF" }}
                      >
                        {cat.totalAmount > 0 ? (
                          cat.totalAmount.toLocaleString()
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr style={{ background: "#F3F4F6" }}>
                  <td
                    colSpan={2}
                    className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap border-t-2 border-r-2 border-gray-300"
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 10,
                      background: "#F3F4F6",
                    }}
                  >
                    Total
                  </td>
                  {activeServices.map((svc) => {
                    const { qty, amount } = serviceTotals[svc];
                    return (
                      <Fragment key={svc}>
                        <td className="px-3 py-3 text-center font-semibold text-gray-900 border-t-2 border-l border-gray-200 tabular-nums">
                          {qty > 0 ? qty : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-gray-900 border-t-2 border-r border-gray-200 tabular-nums">
                          {amount > 0 ? (
                            amount.toLocaleString()
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td
                    className="px-3 py-3 text-center font-bold text-indigo-900 border-t-2 border-l-2 border-indigo-300 tabular-nums"
                    style={{ background: "#C7D2FE" }}
                  >
                    {grandTotalQty}
                  </td>
                  <td
                    className="px-3 py-3 text-center font-bold text-indigo-900 border-t-2 border-indigo-200 tabular-nums"
                    style={{ background: "#C7D2FE" }}
                  >
                    {grandTotalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      </DatePicker>
    </div>
  );
}

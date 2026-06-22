import { db } from "@/db";
import { participants } from "@/db/schema";
import { isNull, and, gte, lt, asc, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { todayPH } from "@/lib/date";
import { FEE_CATEGORIES } from "@/components/form";
import { DatePicker } from "./DatePicker";
import { toTitleCase } from "@/lib/text";

type SortKey = "ar" | "lastName" | "firstName" | "amount";
type SortDir = "asc" | "desc";

function sortLink(
  col: SortKey,
  currentSort: SortKey,
  currentDir: SortDir,
  date: string,
) {
  const nextDir = currentSort === col && currentDir === "asc" ? "desc" : "asc";
  return `/report/remittance?date=${date}&sort=${col}&dir=${nextDir}`;
}

function sortIcon(col: SortKey, currentSort: SortKey, currentDir: SortDir) {
  if (currentSort !== col) return " ↕";
  return currentDir === "asc" ? " ↑" : " ↓";
}

function thClass(col: SortKey, currentSort: SortKey) {
  return `text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:bg-gray-100 transition-colors ${
    currentSort === col ? "text-gray-800" : "text-gray-500"
  }`;
}

export default async function RemittancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; sort?: string; dir?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { date: dateParam, sort: sortParam, dir: dirParam } = await searchParams;
  const date = dateParam || todayPH();
  const sortKey: SortKey = (["ar", "lastName", "firstName", "amount"] as SortKey[]).includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : "ar";
  const sortDir: SortDir = dirParam === "desc" ? "desc" : "asc";

  const startUtc = new Date(`${date}T00:00:00+08:00`);
  const endUtc = new Date(startUtc.getTime() + 86_400_000);

  const orderExpr = (() => {
    const fn = sortDir === "asc" ? asc : desc;
    const nullsLast = (col: Parameters<typeof asc>[0]) =>
      sql`${col} ${sql.raw(sortDir.toUpperCase())} NULLS LAST`;
    switch (sortKey) {
      case "lastName":  return fn(participants.lastName);
      case "firstName": return fn(participants.firstName);
      case "amount":    return fn(participants.registrationFee);
      case "ar":
      default:          return nullsLast(participants.acknowledgementReceiptNumber);
    }
  })();

  const rows = await db
    .select({
      id: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      registrationFee: participants.registrationFee,
      acknowledgementReceiptNumber: participants.acknowledgementReceiptNumber,
    })
    .from(participants)
    .where(
      and(
        isNull(participants.deletedAt),
        gte(participants.createdAt, startUtc),
        lt(participants.createdAt, endUtc),
      )
    )
    .orderBy(orderExpr);

  const totalAmount = rows.reduce((sum, p) => {
    const cat = FEE_CATEGORIES.find((f) => f.value === p.registrationFee);
    return sum + (cat ? parseInt(cat.amount.replace(/[^\d]/g, ""), 10) : 0);
  }, 0);

  const formattedDate = new Date(`${date}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  });

  const cols: { key: SortKey; label: string }[] = [
    { key: "lastName", label: "Last Name" },
    { key: "firstName", label: "First Name" },
    { key: "amount", label: "Amount Paid" },
    { key: "ar", label: "AR Number" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Reports", href: "/report" },
            { label: "Remittance" },
          ]}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Remittance Report</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {rows.length} participant{rows.length !== 1 ? "s" : ""} · {formattedDate}
            </p>
          </div>
          <a
            href={`/api/report/remittance/export?date=${date}&sort=${sortKey}&dir=${sortDir}`}
            className="shrink-0 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            <span>↓</span> Export Excel
          </a>
        </div>
      </div>

      <DatePicker date={date}>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No participants registered on {formattedDate}.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                {cols.map(({ key, label }) => (
                  <th key={key} className={thClass(key, sortKey)}>
                    <a href={sortLink(key, sortKey, sortDir, date)} className="block">
                      {label}
                      <span className="text-gray-400">{sortIcon(key, sortKey, sortDir)}</span>
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p, i) => {
                const cat = FEE_CATEGORIES.find((f) => f.value === p.registrationFee);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{toTitleCase(p.lastName)}</td>
                    <td className="px-4 py-3 text-gray-700">{toTitleCase(p.firstName)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {cat ? `${cat.amount} (Class ${cat.value})` : (p.registrationFee ?? "—")}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.acknowledgementReceiptNumber ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">Total</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">₱{totalAmount.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      </DatePicker>
    </div>
  );
}

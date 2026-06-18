import { db } from "@/db";
import { participants } from "@/db/schema";
import { isNull, and, gte, lt } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { todayPH } from "@/lib/date";
import { FEE_CATEGORIES } from "@/components/form";
import { DatePicker } from "./DatePicker";
import { toTitleCase } from "@/lib/text";

export default async function RemittancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { date: dateParam } = await searchParams;
  const date = dateParam || todayPH();

  const startUtc = new Date(`${date}T00:00:00+08:00`);
  const endUtc = new Date(startUtc.getTime() + 86_400_000);

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
    .orderBy(participants.id);

  const totalAmount = rows.reduce((sum, p) => {
    const cat = FEE_CATEGORIES.find((f) => f.value === p.registrationFee);
    return sum + (cat ? parseInt(cat.amount.replace(/[^\d]/g, ""), 10) : 0);
  }, 0);

  const formattedDate = new Date(`${date}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  });

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
            href={`/api/report/remittance/export?date=${date}`}
            className="shrink-0 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            <span>↓</span> Export Excel
          </a>
        </div>
      </div>

      <DatePicker date={date} />

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No participants registered on {formattedDate}.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount Paid</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">AR Number</th>
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
    </div>
  );
}

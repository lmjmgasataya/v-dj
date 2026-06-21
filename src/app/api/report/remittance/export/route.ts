import { db } from "@/db";
import { participants } from "@/db/schema";
import { isNull, and, gte, lt, asc, desc, sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import { todayPH } from "@/lib/date";
import { FEE_CATEGORIES } from "@/components/form";
import { getSession } from "@/lib/auth";

type SortKey = "ar" | "lastName" | "firstName" | "amount";
type SortDir = "asc" | "desc";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayPH();
  const sortKey: SortKey = (["ar", "lastName", "firstName", "amount"] as SortKey[]).includes(
    searchParams.get("sort") as SortKey
  )
    ? (searchParams.get("sort") as SortKey)
    : "ar";
  const sortDir: SortDir = searchParams.get("dir") === "desc" ? "desc" : "asc";

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

  let totalAmount = 0;

  const data = rows.map((p, i) => {
    const cat = FEE_CATEGORIES.find((f) => f.value === p.registrationFee);
    const amount = cat ? parseInt(cat.amount.replace(/[^\d]/g, ""), 10) : 0;
    totalAmount += amount;
    return {
      "#": i + 1,
      "Last Name": p.lastName,
      "First Name": p.firstName,
      "Fee Category": p.registrationFee ?? "",
      "Amount Paid": amount || "",
      "AR Number": p.acknowledgementReceiptNumber ?? "",
    };
  });

  data.push({
    "#": "" as unknown as number,
    "Last Name": "",
    "First Name": "TOTAL",
    "Fee Category": "",
    "Amount Paid": totalAmount,
    "AR Number": "",
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Remittance");

  const allKeys = Object.keys(data[0] ?? {});
  ws["!cols"] = allKeys.map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String((r as Record<string, unknown>)[key] ?? "").length)) + 2,
  }));

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="remittance_${date}.xlsx"`,
    },
  });
}

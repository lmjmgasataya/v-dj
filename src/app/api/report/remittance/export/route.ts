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

  function feeAmount(fee: string | null): number {
    const cat = FEE_CATEGORIES.find((f) => f.value === fee);
    return cat ? parseInt(cat.amount.replace(/[^\d]/g, ""), 10) : 0;
  }

  const CHUNK_SIZE = 20;
  const sets: typeof rows[] = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    sets.push(rows.slice(i, i + CHUNK_SIZE));
  }

  type ArBucket = { min: number; max: number; count: number; amount: number };
  type ArRow = { "AR From": number | string; "AR To": number | string; "No. of ARs": number | string; "Amount (PHP)": number | string };

  function buildArData(slice: typeof rows, sliceTotal: number): ArRow[] {
    const bucketMap = new Map<number, ArBucket>();
    let noArCount = 0;
    let noArAmount = 0;
    for (const p of slice) {
      const amt = feeAmount(p.registrationFee);
      const raw = p.acknowledgementReceiptNumber;
      if (!raw) { noArCount++; noArAmount += amt; continue; }
      const num = parseInt(raw, 10);
      if (isNaN(num)) { noArCount++; noArAmount += amt; continue; }
      const bucket = Math.ceil(num / 10) || 1;
      const b = bucketMap.get(bucket);
      if (b) { b.min = Math.min(b.min, num); b.max = Math.max(b.max, num); b.count++; b.amount += amt; }
      else { bucketMap.set(bucket, { min: num, max: num, count: 1, amount: amt }); }
    }
    const groups = Array.from(bucketMap.entries()).sort(([a], [b]) => a - b).map(([, g]) => g);
    const result: ArRow[] = groups.map((g) => ({
      "AR From": g.min,
      "AR To": g.count > 1 ? g.max : "",
      "No. of ARs": g.count,
      "Amount (PHP)": g.amount,
    }));
    if (noArCount > 0) {
      result.push({ "AR From": "No AR number", "AR To": "", "No. of ARs": noArCount, "Amount (PHP)": noArAmount });
    }
    result.push({
      "AR From": "Total",
      "AR To": "",
      "No. of ARs": groups.reduce((s, g) => s + g.count, 0) + noArCount,
      "Amount (PHP)": sliceTotal,
    });
    return result;
  }

  const wb = XLSX.utils.book_new();

  sets.forEach((setRows, setIndex) => {
    const globalOffset = setIndex * CHUNK_SIZE;
    let setTotal = 0;
    const data = setRows.map((p, i) => {
      const amount = feeAmount(p.registrationFee);
      setTotal += amount;
      return {
        "#": globalOffset + i + 1,
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
      "Amount Paid": setTotal,
      "AR Number": "",
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const allKeys = Object.keys(data[0] ?? {});
    ws["!cols"] = allKeys.map((key) => ({
      wch: Math.max(key.length, ...data.map((r) => String((r as Record<string, unknown>)[key] ?? "").length)) + 2,
    }));

    // Append AR Range Summary below the participant data (blank row + header + rows)
    const arData = buildArData(setRows, setTotal);
    const arAoa = [
      [],
      ["AR Range Summary"],
      ["AR From", "AR To", "No. of ARs", "Amount (PHP)"],
      ...arData.map((r) => [r["AR From"], r["AR To"], r["No. of ARs"], r["Amount (PHP)"]]),
    ];
    XLSX.utils.sheet_add_aoa(ws, arAoa, { origin: -1 });

    const sheetName = sets.length > 1 ? `Set ${setIndex + 1}` : "Remittance";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="remittance_${date}.xlsx"`,
    },
  });
}

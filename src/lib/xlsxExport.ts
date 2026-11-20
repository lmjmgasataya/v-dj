import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";

export type Cell = string | number | null;
export interface Sheet {
  name: string;
  rows: Cell[][];
  /** Column widths in characters. */
  cols?: number[];
}

/** Excel sheet names: max 31 characters, none of []:*?/\ — and unique within the workbook. */
function sheetName(name: string, used: Set<string>) {
  const base = name.replace(/[[\]:*?/\\]/g, "-").slice(0, 31) || "Sheet";
  let n = base;
  for (let i = 2; used.has(n); i++) n = `${base.slice(0, 28)} ${i}`;
  used.add(n);
  return n;
}

/** An .xlsx download; each sheet gets an autofilter on its header row. */
export function xlsxResponse(sheets: Sheet[], filename: string): Response {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    if (s.cols) ws["!cols"] = s.cols.map((wch) => ({ wch }));
    const width = Math.max(...s.rows.map((r) => r.length), 1);
    if (s.rows.length > 1) ws["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(width - 1)}${s.rows.length}` };
    XLSX.utils.book_append_sheet(wb, ws, sheetName(s.name, used));
  }
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]+/g, "_")}"`,
    },
  });
}

/** L113 Portal exports: developer or lead_pastor, same as the pages. */
export async function isL113ExportAllowed() {
  const session = await getSession();
  return !!session && (session.role === "developer" || session.role === "lead_pastor");
}

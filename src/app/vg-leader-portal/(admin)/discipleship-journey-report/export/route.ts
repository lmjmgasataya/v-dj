import * as XLSX from "xlsx";
import { DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { getSession } from "@/lib/auth";
import { todayPH } from "@/lib/date";
import { leadership113Label } from "@/lib/leadership113";
import { getDiscipleshipJourneyRows } from "../journeyRows";

// The Discipleship Journey Report table as an Excel file. Open to developer and lead_pastor, like
// the page — a lead_pastor gets only their own service's leaders, same as on screen.
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "developer" && session.role !== "lead_pastor")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await getDiscipleshipJourneyRows(session);
  const header = ["Name", "Service", ...DISCIPLESHIP_JOURNEY_STEPS, "L113 Graduate"];
  const ws = XLSX.utils.aoa_to_sheet([
    header,
    ...rows.map((r) => [
      r.name,
      r.service,
      ...DISCIPLESHIP_JOURNEY_STEPS.map((step) => (r.steps[step] ? "Yes" : "")),
      leadership113Label(r.leadership113) ?? "Not set",
    ]),
  ]);
  ws["!cols"] = [{ wch: 32 }, { wch: 22 }, ...DISCIPLESHIP_JOURNEY_STEPS.map((s) => ({ wch: Math.max(10, s.length + 2) })), { wch: 14 }];
  ws["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(header.length - 1)}${rows.length + 1}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Discipleship Journey");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="discipleship_journey_report_${todayPH()}.xlsx"`,
    },
  });
}

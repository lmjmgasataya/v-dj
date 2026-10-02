import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { todayPH } from "@/lib/date";
import { getProfileNotCompletedRows } from "@/lib/vglProfileNotCompleted";

// "Profile Not Yet Completed" from the VG Leaders Report as an Excel file. Developer-only,
// like the card itself: it lists leaders across every service. (The proxy lets lead_pastor
// through to /vg-leader-portal/vgl-report*, so the role check here is what gates it.)
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "developer") return new Response("Unauthorized", { status: 401 });

  const rows = await getProfileNotCompletedRows();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Name", "Service", "Remarks"],
    ...rows.map((r) => [r.name, r.service, r.remarks.join("; ")]),
  ]);
  ws["!cols"] = [{ wch: 32 }, { wch: 20 }, { wch: 90 }];
  ws["!autofilter"] = { ref: `A1:C${rows.length + 1}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Profile Not Yet Completed");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="profile_not_yet_completed_${todayPH()}.xlsx"`,
    },
  });
}

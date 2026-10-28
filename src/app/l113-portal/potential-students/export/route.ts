import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { todayPH } from "@/lib/date";
import { getL113CandidateRows } from "../candidateRows";

// The Potential L113 Students table as an Excel file. Open to developer and lead_pastor, like
// the page — a lead_pastor gets only their own service's leaders, same as on screen.
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "developer" && session.role !== "lead_pastor")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await getL113CandidateRows(session);
  const doneLabel = (done: boolean) => (done ? "Done" : "Not Done");
  const header = ["Name", "Service", "Done with Discipleship Journey", "Empowering Leaders"];
  const ws = XLSX.utils.aoa_to_sheet([
    header,
    ...rows.map((r) => [r.name, r.service, doneLabel(r.doneWithJourney), doneLabel(r.empoweringLeaders)]),
  ]);
  ws["!cols"] = [{ wch: 32 }, { wch: 22 }, { wch: 30 }, { wch: 20 }];
  ws["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(header.length - 1)}${rows.length + 1}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Potential L113 Students");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="potential_l113_students_${todayPH()}.xlsx"`,
    },
  });
}

import { db } from "@/db";
import { vgReportSnapshots, vgConvergenceAttendance, leadership113Batches } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import type { VgSnapshotData } from "@/lib/vgSnapshot";
import { QuarterlyReportDocument, type QuarterlyPdfSnapshot } from "@/lib/quarterlyReportPdf";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "developer") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const aId = searchParams.get("a") ? parseInt(searchParams.get("a")!, 10) : null;
  const bId = searchParams.get("b") ? parseInt(searchParams.get("b")!, 10) : null;

  const snapshots = await db.select().from(vgReportSnapshots).orderBy(desc(vgReportSnapshots.asOfDate));
  const primaryRow = (aId != null ? snapshots.find((s) => s.id === aId) : null) ?? snapshots[0];
  if (!primaryRow) return new Response("No snapshots to export.", { status: 404 });
  const compareRow = bId != null ? snapshots.find((s) => s.id === bId) ?? null : null;

  const primary: QuarterlyPdfSnapshot = {
    label: primaryRow.label,
    asOfDate: primaryRow.asOfDate,
    data: primaryRow.data as VgSnapshotData,
  };
  const compare: QuarterlyPdfSnapshot | null = compareRow
    ? { label: compareRow.label, asOfDate: compareRow.asOfDate, data: compareRow.data as VgSnapshotData }
    : null;

  const [convergenceRows, leadership113Rows] = await Promise.all([
    db.select().from(vgConvergenceAttendance).orderBy(asc(vgConvergenceAttendance.eventDate)),
    db.select().from(leadership113Batches).orderBy(asc(leadership113Batches.id)),
  ]);

  const buffer = await renderToBuffer(
    QuarterlyReportDocument({
      primary,
      compare,
      convergence: convergenceRows.map((c) => ({ label: c.label, attendees: c.attendees })),
      leadership113: leadership113Rows.map((b) => ({ batchName: b.batchName, actual: b.actual, goal: b.goal })),
    })
  );

  const filename = `${primaryRow.label.replace(/[^a-z0-9]+/gi, "_")}_discipleship_report.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}


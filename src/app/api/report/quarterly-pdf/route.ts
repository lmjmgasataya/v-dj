import { db } from "@/db";
import { vgReportSnapshots, vgConvergenceAttendance, leadership113Batches } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import type { VgSnapshotData } from "@/lib/vgSnapshot";
import { QuarterlyReportDocument, type QuarterlyPdfSnapshot } from "@/lib/quarterlyReportPdf";
import { computeVgSnapshotCounts } from "@/lib/vgSnapshotCompute";
import { todayPH } from "@/lib/date";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "developer" && session.role !== "lead_pastor")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  // a=live: Live Now as the primary side, as on the report page.
  const isLiveA = searchParams.get("a") === "live";
  const aId = searchParams.get("a") && !isLiveA ? parseInt(searchParams.get("a")!, 10) : null;
  const bId = searchParams.get("b") ? parseInt(searchParams.get("b")!, 10) : null;

  const snapshots = await db.select().from(vgReportSnapshots).orderBy(desc(vgReportSnapshots.asOfDate));
  const primaryRow = isLiveA ? null : ((aId != null ? snapshots.find((s) => s.id === aId) : null) ?? snapshots[0]);
  if (!isLiveA && !primaryRow) return new Response("No snapshots to export.", { status: 404 });
  const compareRow = bId != null ? snapshots.find((s) => s.id === bId) ?? null : null;

  const primary: QuarterlyPdfSnapshot = primaryRow
    ? { label: primaryRow.label, asOfDate: primaryRow.asOfDate, data: primaryRow.data as VgSnapshotData }
    : {
        label: "Live Now",
        asOfDate: todayPH(),
        data: {
          ...(await computeVgSnapshotCounts()),
          goals: (compareRow?.data as VgSnapshotData | undefined)?.goals ?? { vgLeaders: 0, leadershipGroups: 0 },
        },
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

  const filename = `${primary.label.replace(/[^a-z0-9]+/gi, "_")}_discipleship_report.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}


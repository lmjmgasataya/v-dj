import { db } from "@/db";
import { vgReportSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { snapshotWorkbook } from "@/lib/snapshotExcel";
import type { VgSnapshotData } from "@/lib/vgSnapshot";

// A saved snapshot as Excel, in the quarterly-update form's layout. Developer-only, like the
// Saved Snapshots list (the proxy lets lead_pastor through to /quarterly-report*, so the role
// check here is what gates it).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "developer") return new Response("Unauthorized", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const [snapshot] = await db.select().from(vgReportSnapshots).where(eq(vgReportSnapshots.id, id)).limit(1);
  if (!snapshot) return new Response("Not found", { status: 404 });

  const buf = snapshotWorkbook(snapshot.label, snapshot.asOfDate, snapshot.data as VgSnapshotData);
  const filename = `${snapshot.label.replace(/[^a-z0-9]+/gi, "_")}_snapshot.xlsx`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

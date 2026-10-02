/**
 * Saves a quarterly-report snapshot built from a quarterly-update Google Form export
 * (see src/lib/formSnapshot.ts), for quarters before the VG Leader Portal existed.
 *
 *   npm run db:snapshot-from-form -- <csv path> "<label>" <as-of YYYY-MM-DD> [--goals <vgl> <lgl>] [--dry-run]
 *   npm run db:snapshot-from-form -- backups/q2_2026_responses.csv "Q2 2026" 2026-06-30 --dry-run
 *
 * --dry-run prints the counts without saving. Re-running replaces the snapshot with the
 * same label. Goals default to 0; snapshots made this way can't be edited in the UI
 * (editing drops the name lists), so pass --goals here if they're known.
 */
import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { isNull } from "drizzle-orm";
import { db } from ".";
import { victoryGroupLeaders, vgReportSnapshots } from "./schema";
import { buildFormSnapshot } from "@/lib/formSnapshot";
import { SERVICE_BUCKETS, type VgSnapshotData } from "@/lib/vgSnapshot";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const goalsAt = args.indexOf("--goals");
  const goals =
    goalsAt === -1
      ? { vgLeaders: 0, leadershipGroups: 0 }
      : { vgLeaders: Number(args[goalsAt + 1]) || 0, leadershipGroups: Number(args[goalsAt + 2]) || 0 };
  const [path, label, asOfDate] = args.filter((a, i) => !a.startsWith("--") && (goalsAt === -1 || (i !== goalsAt + 1 && i !== goalsAt + 2)));
  if (!path || !label || !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate ?? "")) {
    console.error('Usage: npm run db:snapshot-from-form -- <csv path> "<label>" <as-of YYYY-MM-DD> [--goals <vgl> <lgl>] [--dry-run]');
    process.exit(1);
  }

  // raw: true keeps cells as text, so mobile numbers keep their leading 0.
  const workbook = XLSX.read(readFileSync(path, "utf8"), { type: "string", raw: true });
  const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
    defval: "",
    raw: false,
  });
  const leaders = await db
    .select({
      id: victoryGroupLeaders.id,
      lastName: victoryGroupLeaders.lastName,
      firstName: victoryGroupLeaders.firstName,
      mobileNumber: victoryGroupLeaders.mobileNumber,
    })
    .from(victoryGroupLeaders)
    .where(isNull(victoryGroupLeaders.deletedAt));

  const result = buildFormSnapshot(rows, leaders);
  const { data } = result;

  console.log(`${label} (as of ${asOfDate}) — ${result.respondents} respondents, ${result.matched} matched to a VG leader record`);
  console.table(
    Object.fromEntries([
      ...SERVICE_BUCKETS.map((b) => [b, { ...data.byService[b], male: data.vglByGender[b].male, female: data.vglByGender[b].female }]),
      ["TOTAL", { ...data.totals, ...data.genderTotals }],
    ]),
  );
  if (result.skippedNoService.length > 0) {
    console.log(`Not counted (service not set / unrecognized): ${result.skippedNoService.join("; ")}`);
  }

  if (dryRun) {
    console.log("Dry run — nothing saved.");
    process.exit(0);
  }

  const snapshot: VgSnapshotData = { ...data, goals, source: "form" };
  await db
    .insert(vgReportSnapshots)
    .values({ label, asOfDate, data: snapshot })
    .onConflictDoUpdate({ target: vgReportSnapshots.label, set: { asOfDate, data: snapshot } });
  console.log(`✓ Saved snapshot "${label}"`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

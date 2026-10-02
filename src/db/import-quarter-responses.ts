/**
 * Imports a quarterly-update Google Form export into manual_quarter_responses.
 *
 *   npm run db:import-responses -- <csv path> "<quarter label>"
 *   npm run db:import-responses -- backups/q2_2026_responses.csv "Q2 2026"
 *
 * Expects the Q2 2026 form's column layout (Timestamp, Last Name, First Name, Mobile Number, Service you are serving).
 * Columns are found by header text, so reordering is fine. Summary rows below the
 * responses (no timestamp / no name) are skipped. Re-running is safe: rows upsert on name.
 */
import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { db } from ".";
import { manualQuarterResponses } from "./schema";
import { formatPersonName } from "@/lib/text";
import { normalizeFormService as normalizeService, parseFormTimestamp as parseTimestamp } from "@/lib/formSnapshot";

function findColumn(header: string[], label: RegExp): number {
  const i = header.findIndex((h) => label.test(h.trim()));
  if (i === -1) throw new Error(`Column not found: ${label}`);
  return i;
}

async function main() {
  const [path, quarterLabel] = process.argv.slice(2);
  if (!path || !quarterLabel) {
    console.error('Usage: npm run db:import-responses -- <csv path> "<quarter label>"');
    process.exit(1);
  }

  // raw: true keeps cells as text, so mobile numbers keep their leading 0.
  const workbook = XLSX.read(readFileSync(path, "utf8"), { type: "string", raw: true });
  const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
    defval: "",
    raw: false,
  });
  const [header, ...body] = rows;
  const col = {
    timestamp: findColumn(header, /^Timestamp$/i),
    lastName: findColumn(header, /^Last Name$/i),
    firstName: findColumn(header, /^First Name/i),
    mobile: findColumn(header, /^Mobile Number$/i),
    service: findColumn(header, /^Service you are serving$/i),
  };

  const byName = new Map<string, typeof manualQuarterResponses.$inferInsert>();
  for (const r of body) {
    const respondedAt = parseTimestamp(String(r[col.timestamp] ?? ""));
    const lastName = formatPersonName(String(r[col.lastName] ?? ""));
    const firstName = formatPersonName(String(r[col.firstName] ?? ""));
    if (!respondedAt || !lastName || !firstName) continue;
    const mobileNumber = String(r[col.mobile] ?? "").trim() || null;
    const serviceAttending = normalizeService(String(r[col.service] ?? ""));
    // A person who submitted twice keeps their latest answer.
    const key = `${lastName.toLowerCase()}|${firstName.toLowerCase()}`;
    const prev = byName.get(key);
    if (!prev || (prev.respondedAt as Date) < respondedAt) {
      byName.set(key, { quarterLabel, lastName, firstName, mobileNumber, serviceAttending, respondedAt });
    }
  }

  const values = Array.from(byName.values());
  if (values.length === 0) {
    console.error("No responses found.");
    process.exit(1);
  }

  for (const v of values) {
    await db
      .insert(manualQuarterResponses)
      .values(v)
      .onConflictDoUpdate({
        target: [manualQuarterResponses.quarterLabel, manualQuarterResponses.lastName, manualQuarterResponses.firstName],
        set: { mobileNumber: v.mobileNumber, serviceAttending: v.serviceAttending, respondedAt: v.respondedAt },
      });
  }
  console.log(`✓ ${values.length} responses imported for ${quarterLabel}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

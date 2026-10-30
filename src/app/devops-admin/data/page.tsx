import { db } from "@/db";
import { smsLogs } from "@/db/schema";
import { count, min, sql } from "drizzle-orm";
import { DEVOPS_TABLES, DEVOPS_TABLE_GROUPS } from "@/lib/devopsTables";
import { ImportForm } from "./ImportForm";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";
import { purgeSmsLogsOlderThan, purgeAllSmsLogs } from "./actions";

// One round trip for every table's row count (UNION ALL) instead of a query per table.
async function getCounts(): Promise<Record<string, number>> {
  const result = await db.execute<{ key: string; c: number }>(
    sql.join(DEVOPS_TABLES.map((t) => sql`SELECT ${t.key} AS key, count(*)::int AS c FROM ${t.table}`), sql` UNION ALL `)
  );
  return Object.fromEntries(result.rows.map((r) => [r.key, r.c]));
}

async function getSmsLogStats() {
  const [row] = await db.select({ count: count(), oldest: min(smsLogs.createdAt) }).from(smsLogs);
  return { count: row?.count ?? 0, oldest: row?.oldest ?? null };
}

const IMPORT_TABLES = [
  { key: "participants",   label: "Participants",   note: "Skips rows with duplicate keys. id column is ignored." },
  { key: "vg_leaders",     label: "VG Leaders",     note: "Skips rows where last name + first name + mobile already exist." },
  { key: "class_sessions", label: "Class Sessions", note: "All rows inserted as new sessions." },
  { key: "vg_groups",      label: "VG Groups",      note: "vgLeaderId must reference an existing VG Leader." },
  { key: "check_ins",      label: "Check-ins",      note: "participantId and classSessionId must reference existing records." },
] as const;

export default async function DataPage() {
  const [counts, smsLogStats] = await Promise.all([getCounts(), getSmsLogStats()]);

  return (
    <div className="flex flex-col gap-6">
      {/* Export */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Export CSV</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Downloads a full CSV of each table, grouped by portal. Data is current at time of download.
            Password / PIN hashes and SMS API keys are left out.
          </p>
        </div>
        {DEVOPS_TABLE_GROUPS.map(({ portal, tables }) => (
          <div key={portal}>
            <p className="px-6 py-2 bg-gray-50 border-y border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {portal}
            </p>
            <div className="divide-y divide-gray-100">
              {tables.map(({ key, label }) => (
                <div key={key} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">{counts[key].toLocaleString()} rows</span>
                  </div>
                  <a
                    href={`/api/devops-admin/export?table=${key}`}
                    download
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                  >
                    Download CSV
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Import CSV</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload a CSV exported from this system. Column headers must match exactly.
            The <span className="font-mono">id</span> column is ignored — new IDs are assigned automatically.
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {IMPORT_TABLES.map(({ key, label, note }) => (
            <div key={key} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{note}</p>
                </div>
              </div>
              <ImportForm table={key} />
            </div>
          ))}
        </div>
      </div>

      {/* SMS Logs Cleanup */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">SMS Logs Cleanup</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Automatically purged after 5 days by the daily keep-alive cron — use these if that job
              isn&rsquo;t running (e.g. <span className="font-mono">CRON_SECRET</span> not set in Vercel) or to clean up sooner.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-800">{smsLogStats.count.toLocaleString()} rows</p>
            {smsLogStats.oldest && (
              <p className="text-xs text-gray-400 mt-0.5">
                oldest: {smsLogStats.oldest.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}
              </p>
            )}
          </div>
        </div>
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <form action={purgeSmsLogsOlderThan} className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Delete logs older than</span>
            <input
              type="number"
              name="days"
              min={0}
              defaultValue={7}
              required
              className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            />
            <span className="text-sm text-gray-600">days</span>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
            >
              Delete
            </button>
          </form>
          <ConfirmDeleteButton
            action={purgeAllSmsLogs}
            message={`Delete all ${smsLogStats.count.toLocaleString()} SMS log records? This cannot be undone.`}
          />
        </div>
      </div>
    </div>
  );
}

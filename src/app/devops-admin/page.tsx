import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { toggleFlag } from "./actions";

const FLAG_LABELS: Record<string, string> = {
  autocomplete_vg_leaders: "VG Leader autocomplete",
  autocomplete_disciplers: "Discipler autocomplete",
};

async function getDbStats() {
  const sizeResult = await db.execute<{ db_size: string }>(
    sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size`
  );
  const tableResult = await db.execute<{ table: string; total_size: string; bytes: string }>(sql`
    SELECT relname AS table,
           pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
           pg_total_relation_size(relid)::text AS bytes
    FROM pg_catalog.pg_statio_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(relid) DESC
  `);
  return { dbSize: sizeResult.rows[0].db_size, tables: tableResult.rows };
}

export default async function DevopsAdminPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const [{ dbSize, tables }, flags] = await Promise.all([
    getDbStats(),
    db.select().from(featureFlags).orderBy(featureFlags.key),
  ]);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Developer only</p>
        <h2 className="text-2xl font-bold text-gray-900">Devops Admin</h2>
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Feature Flags</h3>
          <p className="text-xs text-gray-500 mt-0.5">Changes take effect immediately on the next page load.</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {flags.map((flag) => (
            <li key={flag.key} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {FLAG_LABELS[flag.key] ?? flag.key}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{flag.key}</p>
              </div>
              <form action={toggleFlag.bind(null, flag.key)}>
                <button
                  type="submit"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    flag.enabled ? "bg-indigo-600" : "bg-gray-200"
                  }`}
                  aria-label={flag.enabled ? "Disable" : "Enable"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                      flag.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>

      {/* Database Stats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Database</h3>
          <span className="text-sm font-semibold text-indigo-600">{dbSize}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-6 py-2 text-left font-medium">Table</th>
              <th className="px-6 py-2 text-right font-medium">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tables.map((t) => (
              <tr key={t.table} className="hover:bg-gray-50">
                <td className="px-6 py-2.5 font-mono text-gray-700">{t.table}</td>
                <td className="px-6 py-2.5 text-right text-gray-500">{t.total_size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

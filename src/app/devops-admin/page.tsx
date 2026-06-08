import { db } from "@/db";
import { featureFlags, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { toggleFlag, changeRole, resetPassword, deleteUser, createUser } from "./actions";
// session is read here (not in layout) because we need session.userId to hide delete-self button

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

  const [{ dbSize, tables }, flags, allUsers] = await Promise.all([
    getDbStats(),
    db.select().from(featureFlags).orderBy(featureFlags.key),
    db.select({ id: users.id, username: users.username, name: users.name, role: users.role, createdAt: users.createdAt }).from(users).orderBy(users.createdAt),
  ]);

  return (
    <div className="flex flex-col gap-6">
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

      {/* User Management */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">User Management</h3>
        </div>

        <ul className="divide-y divide-gray-100">
          {allUsers.map((user) => (
            <li key={user.id} className="px-6 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{user.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.role === "developer" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                    {user.role}
                  </span>
                  <span className="text-xs text-gray-400">
                    {user.createdAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Change role */}
                <form action={changeRole} className="flex items-center gap-1.5">
                  <input type="hidden" name="userId" value={user.id} />
                  <select name="role" defaultValue={user.role} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                    <option value="admin_volunteer">admin_volunteer</option>
                    <option value="developer">developer</option>
                  </select>
                  <button type="submit" className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                    Save role
                  </button>
                </form>

                <span className="text-gray-200">|</span>

                {/* Reset password */}
                <form action={resetPassword} className="flex items-center gap-1.5">
                  <input type="hidden" name="userId" value={user.id} />
                  <input
                    type="password"
                    name="newPassword"
                    placeholder="New password"
                    minLength={6}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-32"
                  />
                  <button type="submit" className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                    Reset
                  </button>
                </form>

                {/* Delete — hidden for current user */}
                {user.id !== session.userId && (
                  <>
                    <span className="text-gray-200">|</span>
                    <form action={deleteUser}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        className="text-xs px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Create user */}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">Create User</p>
          <form action={createUser} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Username</label>
              <input name="username" required autoComplete="off" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Full Name</label>
              <input name="name" required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password (min. 6 chars)</label>
              <input type="password" name="password" required minLength={6} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <select name="role" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
                <option value="admin_volunteer">admin_volunteer</option>
                <option value="developer">developer</option>
              </select>
            </div>
            <div className="col-span-2">
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
                Create User
              </button>
            </div>
          </form>
        </div>
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

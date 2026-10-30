import { db } from "@/db";
import { featureFlags, smsApiKeys, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getTableName, ne, sql } from "drizzle-orm";
import { DEVOPS_TABLE_GROUPS } from "@/lib/devopsTables";
import { ACCEPT_PREVIOUS_QUARTER_FLAG, CARRY_OVER_PREVIOUS_QUARTER_FLAG } from "@/lib/vgQuarters";
import { toggleFlag, createFlag, deleteFlag, changeRole, resetPassword, deleteUser, createUser, createSmsApiKey, updateSmsApiKey, deleteSmsApiKey, setSmsApiKeyDefault } from "./actions";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { SmsTester } from "./SmsTester";
import { PasswordInput } from "@/components/PasswordInput";
import { RoleServiceSelect } from "./RoleServiceSelect";
// session is read here (not in layout) because we need session.userId to hide delete-self button

// Every flag the code reads, grouped by the portal it affects. Flags in the database that
// aren't listed here show under "Other" (with a delete button).
const FLAG_GROUPS: { title: string; flags: Record<string, string> }[] = [
  {
    title: "Discipleship Journey Portal — Registration & Participants",
    flags: {
      autocomplete_vg_leaders: "VG Leader autocomplete",
      autocomplete_disciplers: "Discipler autocomplete",
      sms_on_registration: "Send an SMS to participants automatically on registration",
      edit_registration_fee: "Allow editing a participant's registration fee/class on the edit page",
      print_id_show_fullname: "Print IDs — show full name at bottom of card",
      sms_sender: "SMS Sender (show on the Discipleship Journey Portal)",
    },
  },
  {
    title: "Discipleship Journey Portal — Check-in",
    flags: {
      qr_checkin: "QR code check-in (scan to check in + QR on participant page)",
      qr_auto_open_scanner: "QR check-in — auto-open camera after selecting a session",
      victory_day_allow_all_classes: "Victory Day check-in — allow all classes to search & check in (default: Class A/B only)",
      checkin_confirm_popup: "Check-in — show confirmation popup before check-in (see /admin settings)",
      checkin_autocheckin: "Check-in — auto check-in (skip popup, mark On-time) for arrivals on or before 9:00 AM",
      checkin_autocheckin_915: "Check-in — auto check-in (skip popup, mark On-time or Late) for arrivals on or before 9:15 AM",
      checkin_table_assignment: "Check-in — assign table number on check-in (see /table-management/settings)",
      offline_checkin: "Check-in — allow scanning/searching to queue locally and sync later when the connection drops (see /admin)",
      checkin_timeout_fallback: "Check-in — if a check-in takes longer than 5s even while online, save it locally and sync once the response comes back (requires offline_checkin)",
    },
  },
  {
    title: "VG Leader Portal",
    flags: {
      vg_leader_portal: "VG Leader self-service portal (login, manage own victory groups & info)",
      [ACCEPT_PREVIOUS_QUARTER_FLAG]: "Still accepting responses for the previous update period (see /vg-leader-portal)",
      [CARRY_OVER_PREVIOUS_QUARTER_FLAG]: "Carry over the previous period's responses to the live one (see /vg-leader-portal)",
    },
  },
  {
    title: "Event Registration",
    flags: {
      event_registration: "Event Registration (show on home page)",
    },
  },
  {
    title: "Shared",
    flags: {
      new_date_picker: "New date picker (calendar popover) — registration, participant, session and event forms",
    },
  },
];

const KNOWN_FLAGS = new Set(FLAG_GROUPS.flatMap((g) => Object.keys(g.flags)));

// pg table name → portal, for grouping the Database size list.
const PORTAL_BY_TABLE = new Map(
  DEVOPS_TABLE_GROUPS.flatMap(({ portal, tables }) => tables.map((t) => [getTableName(t.table), portal] as const))
);

const OTHER_APPS = "Not in this app's schema (other apps sharing the database)";

function FlagToggle({ flagKey, enabled }: { flagKey: string; enabled: boolean }) {
  return (
    <form action={toggleFlag.bind(null, flagKey)}>
      <button
        type="submit"
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          enabled ? "bg-[#00428E]" : "bg-gray-200"
        }`}
        aria-label={enabled ? "Disable" : "Enable"}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </form>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-6 py-2 bg-gray-50 border-y border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {children}
    </p>
  );
}

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

  const [{ dbSize, tables }, flags, allUsers, allSmsApiKeys] = await Promise.all([
    getDbStats(),
    db.select().from(featureFlags).orderBy(featureFlags.key),
    db.select({ id: users.id, username: users.username, name: users.name, role: users.role, timeService: users.timeService, createdAt: users.createdAt }).from(users).where(ne(users.role, "vg_leader")).orderBy(users.createdAt),
    db.select().from(smsApiKeys).orderBy(smsApiKeys.createdAt),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Feature Flags */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Feature Flags</h3>
          <p className="text-xs text-gray-500 mt-0.5">Changes take effect immediately on the next page load.</p>
        </div>
        {FLAG_GROUPS.map(({ title, flags: groupFlags }) => (
          <div key={title}>
            <GroupHeading>{title}</GroupHeading>
            <ul className="divide-y divide-gray-100">
              {Object.entries(groupFlags).map(([key, label]) => (
                <li key={key} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{key}</p>
                  </div>
                  <FlagToggle flagKey={key} enabled={flags.find((f) => f.key === key)?.enabled ?? false} />
                </li>
              ))}
            </ul>
          </div>
        ))}
        {flags.some((f) => !KNOWN_FLAGS.has(f.key)) && (
          <div>
            <GroupHeading>Other (not read by the code)</GroupHeading>
            <ul className="divide-y divide-gray-100">
              {flags.filter((f) => !KNOWN_FLAGS.has(f.key)).map((flag) => (
                <li key={flag.key} className="flex items-center justify-between gap-4 px-6 py-4">
                  <p className="text-sm font-medium text-gray-800 font-mono">{flag.key}</p>
                  <div className="flex items-center gap-3">
                    <FlagToggle flagKey={flag.key} enabled={flag.enabled} />
                    <ConfirmDeleteButton
                      action={deleteFlag.bind(null, flag.key)}
                      message={`Delete flag "${flag.key}"?`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">Create Flag</p>
          <form action={createFlag} className="flex items-center gap-3">
            <input
              name="key"
              required
              placeholder="flag_key_name"
              pattern="[a-z0-9_]+"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition shrink-0"
            >
              Add Flag
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">Lowercase letters, numbers, and underscores only. Starts disabled.</p>
        </div>
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
                  {user.role === "lead_pastor" && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {user.timeService ?? "No service assigned"}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {user.createdAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Change role */}
                <form action={changeRole} className="flex items-center gap-1.5">
                  <input type="hidden" name="userId" value={user.id} />
                  <RoleServiceSelect defaultRole={user.role} defaultTimeService={user.timeService} compact />
                  <button type="submit" className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                    Save role
                  </button>
                </form>

                <span className="text-gray-200">|</span>

                {/* Reset password */}
                <form action={resetPassword} className="flex items-center gap-1.5">
                  <input type="hidden" name="userId" value={user.id} />
                  <PasswordInput
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
                {user.id !== session!.userId && (
                  <>
                    <span className="text-gray-200">|</span>
                    <ConfirmDeleteButton
                      action={deleteUser}
                      hiddenFields={{ userId: String(user.id) }}
                      message={`Delete user "${user.name}" (${user.username})?`}
                    />
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
              <PasswordInput name="password" required minLength={6} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <div className="flex gap-2">
                <RoleServiceSelect
                  roles={[
                    { value: "admin_volunteer", label: "admin_volunteer" },
                    { value: "developer", label: "developer" },
                    { value: "lead_pastor", label: "lead_pastor" },
                  ]}
                  defaultRole="admin_volunteer"
                />
              </div>
            </div>
            <div className="col-span-2">
              <button type="submit" className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition">
                Create User
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SMS API Keys */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">SMS API Keys</h3>
          <p className="text-xs text-gray-500 mt-0.5">Stored keys are used by the SMS route when no key is passed in the request.</p>
        </div>
        {allSmsApiKeys.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-400">No API keys configured.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {allSmsApiKeys.map((k) => (
              <li key={k.id} className="flex flex-col gap-3 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{k.name}</p>
                    {k.isDefault && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">default</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!k.isDefault && (
                      <form action={setSmsApiKeyDefault.bind(null, k.id)}>
                        <button type="submit" className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                          Set default
                        </button>
                      </form>
                    )}
                    <ConfirmDeleteButton
                      action={deleteSmsApiKey.bind(null, k.id)}
                      message={`Delete API key "${k.name}"?`}
                    />
                  </div>
                </div>
                <form action={updateSmsApiKey.bind(null, k.id)} className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input name="name" required defaultValue={k.name} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">API Key</label>
                    <input
                      name="apiKey"
                      type="password"
                      autoComplete="new-password"
                      placeholder={`${k.apiKey.slice(0, 6)}${"•".repeat(Math.min(k.apiKey.length - 6, 20))}`}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Endpoint</label>
                    <input name="endpoint" type="url" defaultValue={k.endpoint ?? ""} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 font-mono" />
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <button type="submit" className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                      Save changes
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">Add API Key</p>
          <form action={createSmsApiKey} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input name="name" required placeholder="e.g. Traccar Production" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">API Key</label>
              <input name="apiKey" required type="password" autoComplete="new-password" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Endpoint (optional)</label>
              <input name="endpoint" type="url" placeholder="https://www.traccar.org/sms" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono" />
            </div>
            <div className="col-span-2">
              <button type="submit" className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition">
                Add Key
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SMS Tester */}
      <SmsTester />

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
          {/* The Supabase database is shared — other apps' tables (e.g. v-4-events' er_*) land in the last group. */}
          {[...DEVOPS_TABLE_GROUPS.map((g) => g.portal), OTHER_APPS].map((portal) => {
            const rows = tables.filter((t) => (PORTAL_BY_TABLE.get(t.table) ?? OTHER_APPS) === portal);
            if (rows.length === 0) return null;
            return (
              <tbody key={portal} className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={2} className="px-6 py-2 bg-gray-50 border-y border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {portal}
                  </td>
                </tr>
                {rows.map((t) => (
                  <tr key={t.table} className="hover:bg-gray-50">
                    <td className="px-6 py-2.5 font-mono text-gray-700">{t.table}</td>
                    <td className="px-6 py-2.5 text-right text-gray-500">{t.total_size}</td>
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}

import { db } from "@/db";
import {
  participants, disciplers, victoryGroupLeaders, victoryGroups,
  classSessions, checkIns, users, loginLogs,
} from "@/db/schema";
import { count } from "drizzle-orm";
import { ImportForm } from "./ImportForm";

async function getCounts() {
  const [p, d, vgl, vg, cs, ci, u, ll] = await Promise.all([
    db.select({ c: count() }).from(participants).then(r => r[0].c),
    db.select({ c: count() }).from(disciplers).then(r => r[0].c),
    db.select({ c: count() }).from(victoryGroupLeaders).then(r => r[0].c),
    db.select({ c: count() }).from(victoryGroups).then(r => r[0].c),
    db.select({ c: count() }).from(classSessions).then(r => r[0].c),
    db.select({ c: count() }).from(checkIns).then(r => r[0].c),
    db.select({ c: count() }).from(users).then(r => r[0].c),
    db.select({ c: count() }).from(loginLogs).then(r => r[0].c),
  ]);
  return { participants: p, disciplers: d, vg_leaders: vgl, vg_groups: vg, class_sessions: cs, check_ins: ci, users: u, login_logs: ll };
}

const EXPORT_TABLES = [
  { key: "participants",    label: "Participants" },
  { key: "disciplers",      label: "Disciplers" },
  { key: "vg_leaders",      label: "VG Leaders" },
  { key: "vg_groups",       label: "VG Groups" },
  { key: "class_sessions",  label: "Class Sessions" },
  { key: "check_ins",       label: "Check-ins" },
  { key: "users",           label: "Users (no passwords)" },
  { key: "login_logs",      label: "Login Logs" },
] as const;

const IMPORT_TABLES = [
  { key: "participants",   label: "Participants",   note: "Skips rows with duplicate keys. id column is ignored." },
  { key: "disciplers",     label: "Disciplers",     note: "Skips rows where last name + first name + mobile already exist." },
  { key: "vg_leaders",     label: "VG Leaders",     note: "Skips rows where last name + first name + mobile already exist." },
  { key: "class_sessions", label: "Class Sessions", note: "All rows inserted as new sessions." },
  { key: "vg_groups",      label: "VG Groups",      note: "vgLeaderId must reference an existing VG Leader." },
  { key: "check_ins",      label: "Check-ins",      note: "participantId and classSessionId must reference existing records." },
] as const;

export default async function DataPage() {
  const counts = await getCounts();

  return (
    <div className="flex flex-col gap-6">
      {/* Export */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Export CSV</h3>
          <p className="text-xs text-gray-500 mt-0.5">Downloads a full CSV of each table. Data is current at time of download.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {EXPORT_TABLES.map(({ key, label }) => (
            <div key={key} className="px-6 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">{label}</span>
                <span className="ml-2 text-xs text-gray-400 font-mono">
                  {key in counts ? `${counts[key as keyof typeof counts].toLocaleString()} rows` : ""}
                </span>
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
    </div>
  );
}

import { db } from "@/db";
import { loginLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function LoginLogsPage() {
  const rows = await db
    .select()
    .from(loginLogs)
    .orderBy(desc(loginLogs.loggedAt))
    .limit(100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Login Logs</h3>
        <span className="text-xs text-gray-400">last 100 · read-only</span>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Username</th>
                <th className="px-4 py-2 text-center font-medium">Result</th>
                <th className="px-4 py-2 text-left font-medium">IP Address</th>
                <th className="px-4 py-2 text-left font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-gray-800">{l.username}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${l.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {l.success ? "OK" : "Fail"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{l.ipAddress ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {l.loggedAt.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">No login logs yet.</p>
      )}
    </div>
  );
}

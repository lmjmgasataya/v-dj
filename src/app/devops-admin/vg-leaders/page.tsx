import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { asc } from "drizzle-orm";
import { createVgLeader, archiveVgLeader, restoreVgLeader } from "./actions";

const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

export default async function VgLeadersPage() {
  const rows = await db.select().from(victoryGroupLeaders).orderBy(asc(victoryGroupLeaders.lastName));
  const active = rows.filter((r) => !r.deletedAt);
  const archived = rows.filter((r) => r.deletedAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">VG Leaders</h3>
          <span className="text-xs text-gray-400">{active.length} active · {archived.length} archived</span>
        </div>

        {active.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Last Name</th>
                  <th className="px-4 py-2 text-left font-medium">First Name</th>
                  <th className="px-4 py-2 text-left font-medium">Mobile</th>
                  <th className="px-4 py-2 text-left font-medium">Messenger</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {active.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{v.lastName}</td>
                    <td className="px-4 py-2.5 text-gray-700">{v.firstName}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{v.mobileNumber}</td>
                    <td className="px-4 py-2.5 text-gray-500">{v.facebookMessengerName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={archiveVgLeader}>
                        <input type="hidden" name="id" value={v.id} />
                        <button type="submit" className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition">Archive</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No active VG leaders.</p>
        )}

        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">Add VG Leader</p>
          <form action={createVgLeader} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Last Name</label>
              <input name="lastName" required className={input} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">First Name</label>
              <input name="firstName" required className={input} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Middle Initial</label>
              <input name="middleInitial" maxLength={3} className={input} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mobile Number</label>
              <input name="mobileNumber" required type="tel" className={input} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Facebook / Messenger Name</label>
              <input name="facebookMessengerName" className={input} />
            </div>
            <div className="col-span-2">
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">Add</button>
            </div>
          </form>
        </div>
      </div>

      {archived.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-500">Archived VG Leaders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {archived.map((v) => (
                  <tr key={v.id} className="opacity-60">
                    <td className="px-4 py-2.5 text-gray-500">{v.lastName}, {v.firstName}</td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{v.mobileNumber}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={restoreVgLeader}>
                        <input type="hidden" name="id" value={v.id} />
                        <button type="submit" className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition">Restore</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

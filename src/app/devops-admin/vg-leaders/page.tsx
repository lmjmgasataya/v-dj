import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { asc } from "drizzle-orm";
import { createVgLeader, deleteVgLeader } from "./actions";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";

const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

export default async function VgLeadersPage() {
  const rows = await db.select().from(victoryGroupLeaders).orderBy(asc(victoryGroupLeaders.lastName));
  const active = rows.filter((r) => !r.deletedAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">VG Leaders</h3>
          <span className="text-xs text-gray-400">{active.length} active</span>
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
                      <ConfirmDeleteButton
                        action={deleteVgLeader}
                        hiddenFields={{ id: String(v.id) }}
                        message={`Delete ${v.firstName} ${v.lastName}? This cannot be undone.`}
                      />
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
              <button type="submit" className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition">Add</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

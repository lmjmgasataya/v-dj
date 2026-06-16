import { db } from "@/db";
import { disciplers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { createDiscipler, deleteDiscipler } from "./actions";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";

const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

export default async function DisciplersPage() {
  const rows = await db.select().from(disciplers).orderBy(asc(disciplers.lastName));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Disciplers</h3>
        <span className="text-xs text-gray-400">{rows.length} records</span>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">ID</th>
                <th className="px-4 py-2 text-left font-medium">Last Name</th>
                <th className="px-4 py-2 text-left font-medium">First Name</th>
                <th className="px-4 py-2 text-left font-medium">Mobile</th>
                <th className="px-4 py-2 text-left font-medium">Messenger</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{d.id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{d.lastName}</td>
                  <td className="px-4 py-2.5 text-gray-700">{d.firstName}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{d.mobileNumber}</td>
                  <td className="px-4 py-2.5 text-gray-500">{d.messengerName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <ConfirmDeleteButton
                      action={deleteDiscipler}
                      hiddenFields={{ id: String(d.id) }}
                      message={`Delete discipler "${d.lastName}, ${d.firstName}"?`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">No disciplers yet.</p>
      )}

      <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700 mb-3">Add Discipler</p>
        <form action={createDiscipler} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Last Name</label>
            <input name="lastName" required className={input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">First Name</label>
            <input name="firstName" required className={input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mobile Number</label>
            <input name="mobileNumber" required type="tel" className={input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Messenger / Facebook Name</label>
            <input name="messengerName" className={input} />
          </div>
          <div className="col-span-2">
            <button type="submit" className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { db } from "@/db";
import { classSessions, featureFlags } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createClassSession, deleteClassSession, toggleSessionFlag } from "./actions";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";
import { DatePickerField } from "@/components/DatePickerField";

const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

export default async function ClassSessionsPage() {
  const [sessions, flags] = await Promise.all([
    db.select().from(classSessions).orderBy(desc(classSessions.sessionDate)),
    db.select().from(featureFlags),
  ]);
  const newDatePicker = (Object.fromEntries(flags.map((f) => [f.key, f.enabled])))["new_date_picker"] ?? false;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Class Sessions</h3>
        <span className="text-xs text-gray-400">{sessions.length} records</span>
      </div>

      {sessions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-center font-medium">Victory Day</th>
                <th className="px-4 py-2 text-center font-medium">Walk-in</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.sessionDate}</td>
                  <td className="px-4 py-2.5 text-center">
                    <form action={toggleSessionFlag}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="field" value="isVictoryDay" />
                      <button type="submit" className={`text-xs px-2 py-0.5 rounded font-medium transition ${s.isVictoryDay ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                        {s.isVictoryDay ? "Yes" : "No"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <form action={toggleSessionFlag}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="field" value="allowsWalkIn" />
                      <button type="submit" className={`text-xs px-2 py-0.5 rounded font-medium transition ${s.allowsWalkIn ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                        {s.allowsWalkIn ? "Yes" : "No"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ConfirmDeleteButton
                      action={deleteClassSession}
                      hiddenFields={{ id: String(s.id) }}
                      message={`Delete session "${s.name}" (${s.sessionDate})?`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">No sessions yet.</p>
      )}

      <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700 mb-3">Add Session</p>
        <form action={createClassSession} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input name="name" required className={input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <DatePickerField name="sessionDate" required className={input} newDatePicker={newDatePicker} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" name="isVictoryDay" className="rounded" />
              Victory Day
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" name="allowsWalkIn" className="rounded" />
              Allows Walk-in
            </label>
          </div>
          <div className="flex items-end">
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

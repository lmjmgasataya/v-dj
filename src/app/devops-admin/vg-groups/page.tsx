import { db } from "@/db";
import { victoryGroups, victoryGroupLeaders, lifestageEnum } from "@/db/schema";
import { eq, isNull, asc } from "drizzle-orm";
import { createVgGroup, deleteVgGroup } from "./actions";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";

const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";
const select = input + " bg-white";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const FREQUENCIES = ["Weekly","Every other week","Once a month","Others"];
const LIFESTAGES = lifestageEnum.enumValues;
const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 5;
  const ampm = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${ampm}`;
});

export default async function VgGroupsPage() {
  const [groups, leaders] = await Promise.all([
    db.select({
      id: victoryGroups.id,
      place: victoryGroups.place,
      day: victoryGroups.day,
      time: victoryGroups.time,
      frequency: victoryGroups.frequency,
      otherFrequency: victoryGroups.otherFrequency,
      lifeStage: victoryGroups.lifeStage,
      leaderLastName: victoryGroupLeaders.lastName,
      leaderFirstName: victoryGroupLeaders.firstName,
    })
      .from(victoryGroups)
      .leftJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
      .orderBy(asc(victoryGroups.day)),
    db.select({ id: victoryGroupLeaders.id, lastName: victoryGroupLeaders.lastName, firstName: victoryGroupLeaders.firstName })
      .from(victoryGroupLeaders)
      .where(isNull(victoryGroupLeaders.deletedAt))
      .orderBy(asc(victoryGroupLeaders.lastName)),
  ]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">VG Groups</h3>
        <span className="text-xs text-gray-400">{groups.length} records</span>
      </div>

      {groups.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Leader</th>
                <th className="px-4 py-2 text-left font-medium">Place</th>
                <th className="px-4 py-2 text-left font-medium">Day</th>
                <th className="px-4 py-2 text-left font-medium">Time</th>
                <th className="px-4 py-2 text-left font-medium">Frequency</th>
                <th className="px-4 py-2 text-left font-medium">Life Stage</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {g.leaderLastName && g.leaderFirstName ? `${g.leaderLastName}, ${g.leaderFirstName}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{g.place}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.day}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.time}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {g.frequency === "Others" && g.otherFrequency ? g.otherFrequency : g.frequency}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{g.lifeStage ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <ConfirmDeleteButton
                      action={deleteVgGroup}
                      hiddenFields={{ id: String(g.id) }}
                      message={`Delete VG group (${g.day} ${g.time})?`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">No VG groups yet.</p>
      )}

      <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700 mb-3">Add VG Group</p>
        <form action={createVgGroup} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">VG Leader</label>
            <select name="vgLeaderId" required className={select}>
              <option value="">-- Select leader --</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>{l.lastName}, {l.firstName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Place</label>
            <input name="place" required className={input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Time</label>
            <select name="time" required className={select}>
              <option value="">-- Select time --</option>
              {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Day</label>
            <select name="day" required className={select}>
              <option value="">-- Select day --</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Frequency</label>
            <select name="frequency" required className={select}>
              <option value="">-- Select --</option>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Other Frequency (if Others)</label>
            <input name="otherFrequency" className={input} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Life Stage</label>
            <select name="lifeStage" className={select}>
              <option value="">-- Any --</option>
              {LIFESTAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <button type="submit" className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

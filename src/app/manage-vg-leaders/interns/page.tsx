import { db } from "@/db";
import { victoryGroups, victoryGroupLeaders } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";
import { isInternSet } from "@/lib/vgSnapshotCompute";

export default async function InternsPage() {
  const groups = await db
    .select({
      id: victoryGroups.id,
      intern: victoryGroups.intern,
      place: victoryGroups.place,
      day: victoryGroups.day,
      time: victoryGroups.time,
      isActive: victoryGroups.isActive,
      leaderLastName: victoryGroupLeaders.lastName,
      leaderFirstName: victoryGroupLeaders.firstName,
    })
    .from(victoryGroups)
    .innerJoin(victoryGroupLeaders, eq(victoryGroups.vgLeaderId, victoryGroupLeaders.id))
    .where(isNull(victoryGroups.deletedAt))
    .orderBy(victoryGroups.intern);

  const interns = groups
    .filter((g) => isInternSet(g.intern))
    .sort((a, b) => (a.intern ?? "").localeCompare(b.intern ?? ""));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Interns</h3>
        <span className="text-xs text-gray-400">{interns.length} intern{interns.length !== 1 ? "s" : ""}</span>
      </div>
      {interns.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">No interns recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Intern</th>
                <th className="px-4 py-2 text-left font-medium">VG Leader</th>
                <th className="px-4 py-2 text-left font-medium">Place</th>
                <th className="px-4 py-2 text-left font-medium">Day</th>
                <th className="px-4 py-2 text-left font-medium">Time</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {interns.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-900 font-medium">{g.intern}</td>
                  <td className="px-4 py-2.5 text-gray-700">{g.leaderLastName}, {g.leaderFirstName}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.place}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.day}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.time}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        g.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {g.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

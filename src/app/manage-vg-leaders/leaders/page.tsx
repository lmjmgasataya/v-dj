import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, users } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { toTitleCase } from "@/lib/text";

export default async function VgLeadersListPage() {
  const [leaders, activeGroups, accounts] = await Promise.all([
    db
      .select()
      .from(victoryGroupLeaders)
      .where(isNull(victoryGroupLeaders.deletedAt))
      .orderBy(asc(victoryGroupLeaders.lastName)),
    db
      .select({ vgLeaderId: victoryGroups.vgLeaderId })
      .from(victoryGroups)
      .where(and(isNull(victoryGroups.deletedAt), eq(victoryGroups.isActive, true))),
    db.select({ vgLeaderId: users.vgLeaderId }).from(users).where(eq(users.role, "vg_leader")),
  ]);

  const groupCountByLeader = new Map<number, number>();
  for (const g of activeGroups) {
    groupCountByLeader.set(g.vgLeaderId, (groupCountByLeader.get(g.vgLeaderId) ?? 0) + 1);
  }
  const claimedLeaderIds = new Set(accounts.map((a) => a.vgLeaderId).filter((id): id is number => id != null));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">VG Leaders</h3>
        <span className="text-xs text-gray-400">{leaders.length} active</span>
      </div>
      {leaders.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">No active VG leaders.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Mobile</th>
                <th className="px-4 py-2 text-left font-medium">Portal Account</th>
                <th className="px-4 py-2 text-left font-medium">Active Groups</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaders.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800">
                      {toTitleCase(l.lastName)}, {toTitleCase(l.firstName)}
                    </p>
                    {l.nickname && <p className="text-xs text-gray-400">&quot;{l.nickname}&quot;</p>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{l.mobileNumber}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        claimedLeaderIds.has(l.id) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {claimedLeaderIds.has(l.id) ? "Claimed" : "Not claimed"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{groupCountByLeader.get(l.id) ?? 0}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/vg-leaders/${l.id}/edit`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                    >
                      Edit
                    </Link>
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

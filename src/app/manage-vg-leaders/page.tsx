import { db } from "@/db";
import { disciplers, victoryGroupLeaders } from "@/db/schema";
import { asc } from "drizzle-orm";
import { promoteDisciplerToVgLeader } from "./actions";
import { toTitleCase } from "@/lib/text";

export default async function ManageVgLeadersPage() {
  const [allDisciplers, allVgLeaders] = await Promise.all([
    db.select().from(disciplers).orderBy(asc(disciplers.lastName)),
    db.select({ lastName: victoryGroupLeaders.lastName, firstName: victoryGroupLeaders.firstName }).from(victoryGroupLeaders),
  ]);

  const vgLeaderNameKey = (lastName: string, firstName: string) =>
    `${lastName.trim().toLowerCase()}|${firstName.trim().toLowerCase()}`;
  const vgLeaderNames = new Set(allVgLeaders.map((v) => vgLeaderNameKey(v.lastName, v.firstName)));
  const unlinkedDisciplers = allDisciplers.filter(
    (d) => !vgLeaderNames.has(vgLeaderNameKey(d.lastName, d.firstName))
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Promote Disciplers to VG Leaders</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Some disciplers are also Victory Group leaders but don&apos;t have a VG leader record yet.
          Promoting creates one from their discipler info so they can use the VG Leader Portal.
        </p>
      </div>
      {unlinkedDisciplers.length === 0 ? (
        <p className="px-6 py-4 text-sm text-gray-400">Every discipler already has a matching VG leader record.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {unlinkedDisciplers.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {toTitleCase(d.lastName)}, {toTitleCase(d.firstName)}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{d.mobileNumber}</p>
              </div>
              <form action={promoteDisciplerToVgLeader.bind(null, d.id)}>
                <button type="submit" className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                  Promote to VG Leader
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

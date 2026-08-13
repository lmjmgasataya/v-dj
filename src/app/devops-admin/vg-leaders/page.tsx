import { db } from "@/db";
import { victoryGroupLeaders, participants } from "@/db/schema";
import { asc, inArray, isNull, and, or } from "drizzle-orm";
import { createVgLeader, deleteVgLeader } from "./actions";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";
import { ParticipantsCell, type ParticipantsCellEntry } from "@/components/ParticipantsCell";
import { toTitleCase } from "@/lib/text";

const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

export default async function VgLeadersPage() {
  const rows = await db.select().from(victoryGroupLeaders).orderBy(asc(victoryGroupLeaders.lastName));
  const active = rows.filter((r) => !r.deletedAt);
  const activeIds = active.map((v) => v.id);

  const affiliatedParticipants = active.length > 0
    ? await db
        .select({ id: participants.id, lastName: participants.lastName, firstName: participants.firstName, vgLeaderId: participants.vgLeaderId, disciplerId: participants.disciplerId })
        .from(participants)
        .where(and(
          isNull(participants.deletedAt),
          or(inArray(participants.vgLeaderId, activeIds), inArray(participants.disciplerId, activeIds))
        ))
        .orderBy(asc(participants.lastName))
    : [];

  const participantsByLeader: Record<number, ParticipantsCellEntry[]> = {};
  const activeIdSet = new Set(activeIds);
  for (const p of affiliatedParticipants) {
    if (p.vgLeaderId != null && activeIdSet.has(p.vgLeaderId)) {
      (participantsByLeader[p.vgLeaderId] ??= []).push({ id: p.id, lastName: p.lastName, firstName: p.firstName, relation: "vg_leader" });
    }
    if (p.disciplerId != null && activeIdSet.has(p.disciplerId)) {
      (participantsByLeader[p.disciplerId] ??= []).push({ id: p.id, lastName: p.lastName, firstName: p.firstName, relation: "discipler" });
    }
  }

  const mobileCounts = new Map<string, number>();
  for (const v of active) {
    const key = v.mobileNumber?.trim();
    if (!key) continue;
    mobileCounts.set(key, (mobileCounts.get(key) ?? 0) + 1);
  }
  const isDuplicateMobile = (mobileNumber: string | null) => {
    const key = mobileNumber?.trim();
    return !!key && (mobileCounts.get(key) ?? 0) > 1;
  };

  const nameCounts = new Map<string, number>();
  for (const v of active) {
    const key = `${v.lastName.trim().toLowerCase()}|${v.firstName.trim().toLowerCase()}`;
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  const isDuplicateName = (lastName: string, firstName: string) => {
    const key = `${lastName.trim().toLowerCase()}|${firstName.trim().toLowerCase()}`;
    return (nameCounts.get(key) ?? 0) > 1;
  };

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
                  <th className="px-4 py-2 text-left font-medium">ID</th>
                  <th className="px-4 py-2 text-left font-medium">Last Name</th>
                  <th className="px-4 py-2 text-left font-medium">First Name</th>
                  <th className="px-4 py-2 text-left font-medium">Mobile</th>
                  <th className="px-4 py-2 text-left font-medium">Messenger</th>
                  <th className="px-4 py-2 text-left font-medium">Participants</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {active.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{v.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{toTitleCase(v.lastName)}</td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {toTitleCase(v.firstName)}
                      {isDuplicateName(v.lastName, v.firstName) && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                          Duplicate
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      <span className={isDuplicateMobile(v.mobileNumber) ? "text-red-600 font-semibold" : "text-gray-500"}>
                        {v.mobileNumber}
                      </span>
                      {isDuplicateMobile(v.mobileNumber) && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                          Duplicate
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{v.facebookMessengerName ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <ParticipantsCell participants={participantsByLeader[v.id] ?? []} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ConfirmDeleteButton
                        action={deleteVgLeader}
                        hiddenFields={{ id: String(v.id) }}
                        message={`Delete ${toTitleCase(v.firstName)} ${toTitleCase(v.lastName)}? This cannot be undone.`}
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

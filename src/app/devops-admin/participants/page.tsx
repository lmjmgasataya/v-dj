import { db } from "@/db";
import { participants } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { archiveParticipant, restoreParticipant } from "./actions";

export default async function ParticipantsPage() {
  const rows = await db
    .select({
      id: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      mobileNumber: participants.mobileNumber,
      registrationFee: participants.registrationFee,
      createdAt: participants.createdAt,
      deletedAt: participants.deletedAt,
    })
    .from(participants)
    .orderBy(desc(participants.createdAt))
    .limit(200);

  const active = rows.filter((r) => !r.deletedAt);
  const archived = rows.filter((r) => r.deletedAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Participants</h3>
          <span className="text-xs text-gray-400">{active.length} active · {archived.length} archived · showing last 200</span>
        </div>

        {active.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Mobile</th>
                  <th className="px-4 py-2 text-left font-medium">Fee</th>
                  <th className="px-4 py-2 text-left font-medium">Registered</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {active.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      <Link href={`/participants/${p.id}/edit`} className="hover:text-indigo-600 transition">
                        {p.lastName}, {p.firstName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{p.mobileNumber ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.registrationFee ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {p.createdAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={archiveParticipant}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition">Archive</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No participants yet.</p>
        )}
      </div>

      {archived.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-500">Archived Participants</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {archived.map((p) => (
                  <tr key={p.id} className="opacity-60">
                    <td className="px-4 py-2.5 text-gray-500">{p.lastName}, {p.firstName}</td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{p.mobileNumber ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={restoreParticipant}>
                        <input type="hidden" name="id" value={p.id} />
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

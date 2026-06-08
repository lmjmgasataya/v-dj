import { db } from "@/db";
import { checkIns, participants, classSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { deleteCheckIn } from "./actions";

export default async function CheckInsPage() {
  const rows = await db
    .select({
      id: checkIns.id,
      participantLastName: participants.lastName,
      participantFirstName: participants.firstName,
      sessionName: classSessions.name,
      checkedInAt: checkIns.checkedInAt,
      remarks: checkIns.remarks,
    })
    .from(checkIns)
    .leftJoin(participants, eq(checkIns.participantId, participants.id))
    .leftJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
    .orderBy(desc(checkIns.checkedInAt))
    .limit(200);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Check-ins</h3>
        <span className="text-xs text-gray-400">{rows.length} records · showing last 200</span>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Participant</th>
                <th className="px-4 py-2 text-left font-medium">Session</th>
                <th className="px-4 py-2 text-left font-medium">Checked In</th>
                <th className="px-4 py-2 text-left font-medium">Remarks</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {c.participantLastName && c.participantFirstName
                      ? `${c.participantLastName}, ${c.participantFirstName}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{c.sessionName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {c.checkedInAt.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{c.remarks ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteCheckIn}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-6 py-8 text-sm text-gray-400 text-center">No check-ins yet.</p>
      )}
    </div>
  );
}

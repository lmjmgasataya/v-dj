import { db } from "@/db";
import { checkIns, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toTitleCase } from "@/lib/text";
import { getTableSettings } from "@/lib/settings";

export async function TablesResults({ sessionId }: { sessionId: number }) {
  const [rows, { tableCapacity, totalTables }] = await Promise.all([
    db
      .select({
        tableNumber: checkIns.tableNumber,
        lastName: participants.lastName,
        firstName: participants.firstName,
        middleInitial: participants.middleInitial,
      })
      .from(checkIns)
      .innerJoin(participants, eq(checkIns.participantId, participants.id))
      .where(eq(checkIns.classSessionId, sessionId))
      .orderBy(participants.lastName, participants.firstName),
    getTableSettings(),
  ]);

  const byTable = new Map<number, typeof rows>();
  const unseated: typeof rows = [];
  for (const row of rows) {
    if (row.tableNumber == null) {
      unseated.push(row);
      continue;
    }
    const list = byTable.get(row.tableNumber) ?? [];
    list.push(row);
    byTable.set(row.tableNumber, list);
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
        No check-ins yet for this session.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Checked In", value: rows.length },
          { label: "Tables Used", value: byTable.size },
          { label: "Table Capacity", value: tableCapacity },
          { label: "Total Tables", value: totalTables },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-indigo-600 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: totalTables }, (_, i) => i + 1).map((tableNumber) => {
          const people = byTable.get(tableNumber) ?? [];
          if (people.length === 0) return null;
          const full = people.length >= tableCapacity;
          return (
            <div key={tableNumber} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Table {tableNumber}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${full ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {people.length}/{tableCapacity}
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
                {people.map((p, i) => (
                  <li key={i} className="px-4 py-2 text-sm text-gray-700 capitalize">
                    {toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}
                    {p.middleInitial ? ` ${toTitleCase(p.middleInitial)}.` : ""}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {unseated.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Not Seated</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {unseated.length}
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {unseated.map((p, i) => (
                <li key={i} className="px-4 py-2 text-sm text-gray-700 capitalize">
                  {toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}
                  {p.middleInitial ? ` ${toTitleCase(p.middleInitial)}.` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

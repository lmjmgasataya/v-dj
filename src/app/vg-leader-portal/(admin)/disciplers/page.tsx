import { getVgLeaderRows } from "../vgLeaderRows";
import { VgLeadersTable } from "../VgLeadersTable";

export default async function DisciplersListPage() {
  const rows = await getVgLeaderRows();
  const disciplers = rows.filter((l) => !l.claimed);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Disciplers</h3>
        <span className="text-xs text-gray-400">{disciplers.length}</span>
      </div>
      <VgLeadersTable rows={disciplers} enableMerge />
    </div>
  );
}

import { getVgLeaderRows } from "../vgLeaderRows";
import { VgLeadersTable } from "../VgLeadersTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function VgLeadersListPage() {
  const rows = await getVgLeaderRows();
  const vgLeaders = rows.filter((l) => l.claimed);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal", href: "/vg-leader-portal" }, { label: "VG Leaders" }]} />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">VG Leaders</h3>
          <span className="text-xs text-gray-400">{vgLeaders.length}</span>
        </div>
        <VgLeadersTable rows={vgLeaders} />
      </div>
    </div>
  );
}

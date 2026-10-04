import { getVgLeaderRows } from "../vgLeaderRows";
import { VgLeadersTable } from "../VgLeadersTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import Link from "next/link";

export default async function VgLeadersListPage() {
  const rows = await getVgLeaderRows();
  const vgLeaders = rows.filter((l) => l.claimed);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal", href: "/vg-leader-portal" }, { label: "VG Leaders" }]} />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">VG Leaders</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{vgLeaders.length}</span>
            <Link
              href="/vg-leader-portal/leaders/deleted"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Deleted VG Leaders
            </Link>
          </div>
        </div>
        <VgLeadersTable rows={vgLeaders} />
      </div>
    </div>
  );
}

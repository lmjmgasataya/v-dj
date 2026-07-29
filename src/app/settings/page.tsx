import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTableSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { updateTableSettings } from "./actions";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const { tableCapacity, totalTables } = await getTableSettings();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Settings" }]} />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Table Assignment</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Controls automatic table-number assignment at check-in. Table 1 fills first, then the next table, and so on.
          </p>
        </div>
        <form action={updateTableSettings} className="grid grid-cols-2 gap-4 px-6 py-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Table Capacity</label>
            <input
              name="tableCapacity"
              type="number"
              min={1}
              required
              defaultValue={tableCapacity}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Total Tables</label>
            <input
              name="totalTables"
              type="number"
              min={1}
              required
              defaultValue={totalTables}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

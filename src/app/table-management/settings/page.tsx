import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTableRanges } from "@/lib/tables";
import { TableRangesForm } from "./TableRangesForm";

export default async function TableManagementSettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const ranges = await getTableRanges();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Table Capacity</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Define table ranges and how many seats each one holds. Check-in fills the first
          range&rsquo;s tables before moving to the next range.
        </p>
      </div>
      <TableRangesForm initialRanges={ranges} />
    </div>
  );
}

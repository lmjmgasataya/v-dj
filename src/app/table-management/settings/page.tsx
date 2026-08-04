import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTableRanges } from "@/lib/tables";
import { TableRangesForm } from "./TableRangesForm";
import { setTableAssignmentFlag } from "./actions";

export default async function TableManagementSettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const [ranges, [flag]] = await Promise.all([
    getTableRanges(),
    db.select().from(featureFlags).where(eq(featureFlags.key, "checkin_table_assignment")).limit(1),
  ]);
  const tableAssignmentEnabled = flag?.enabled ?? true;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Table Assignment</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            When off, check-ins no longer assign a table number.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <p className="text-sm font-medium text-gray-800">Assign table number on check-in</p>
          <form action={setTableAssignmentFlag.bind(null, !tableAssignmentEnabled)}>
            <button
              type="submit"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                tableAssignmentEnabled ? "bg-[#00428E]" : "bg-gray-200"
              }`}
              aria-label={tableAssignmentEnabled ? "Disable" : "Enable"}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                  tableAssignmentEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </form>
        </div>
      </div>

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
    </div>
  );
}

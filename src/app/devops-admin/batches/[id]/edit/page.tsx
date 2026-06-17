import { db } from "@/db";
import { batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { updateBatch } from "../../actions";

const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

export default async function EditBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const { id } = await params;
  const batch = await db.select().from(batches).where(eq(batches.id, Number(id))).then((rows) => rows[0]);
  if (!batch) redirect("/devops-admin/batches");

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Edit Batch</h3>
        </div>
        <form action={updateBatch} className="px-6 py-5 flex flex-col gap-4">
          <input type="hidden" name="id" value={batch.id} />
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input name="name" required defaultValue={batch.name} className={input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Class Start</label>
            <input type="date" name="classStartDate" required defaultValue={batch.classStartDate} className={input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Class End</label>
            <input type="date" name="classEndDate" required defaultValue={batch.classEndDate} className={input} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Registration Start</label>
            <input type="date" name="registrationStartDate" defaultValue={batch.registrationStartDate ?? ""} className={input} />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition">Save</button>
            <Link href="/devops-admin/batches" className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

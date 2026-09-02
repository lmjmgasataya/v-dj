import { db } from "@/db";
import { batches } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SessionsNav } from "../SessionsNav";
import { createBatch, deleteBatch, setDefaultBatch } from "./actions";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

const input =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

export default async function BatchesPage() {
  const all = await db.select().from(batches).orderBy(desc(batches.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Discipleship Journey Portal", href: "/journey" }, { label: "Sessions", href: "/sessions" }, { label: "Batches" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Class Sessions</h2>
      </div>

      <SessionsNav />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Batches</h3>
          <span className="text-xs text-gray-400">{all.length} records</span>
        </div>

        {all.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Class Period</th>
                  <th className="px-4 py-2 text-left font-medium">Reg. Start</th>
                  <th className="px-4 py-2 text-center font-medium">Default</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {all.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{b.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {b.classStartDate} – {b.classEndDate}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{b.registrationStartDate ?? "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      {b.isDefault ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-700">
                          Yes
                        </span>
                      ) : (
                        <form action={setDefaultBatch}>
                          <input type="hidden" name="id" value={b.id} />
                          <button
                            type="submit"
                            className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-400 hover:bg-gray-200 transition"
                          >
                            Set
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/sessions/batches/${b.id}/edit`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Edit
                        </Link>
                        <ConfirmDeleteButton
                          action={deleteBatch}
                          hiddenFields={{ id: String(b.id) }}
                          message={`Delete batch "${b.name}"?`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No batches yet.</p>
        )}

        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">Add Batch</p>
          <form action={createBatch} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input name="name" required placeholder="e.g. DJ Jul–Oct 2026" className={input} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Registration Start</label>
              <input type="date" name="registrationStartDate" className={input} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Class Start</label>
              <input type="date" name="classStartDate" required className={input} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Class End</label>
              <input type="date" name="classEndDate" required className={input} />
            </div>
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" name="isDefault" className="rounded" />
                Set as default
              </label>
              <button
                type="submit"
                className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

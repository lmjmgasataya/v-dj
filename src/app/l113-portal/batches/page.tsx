import Link from "next/link";
import { db } from "@/db";
import { l113BatchStudents } from "@/db/schema";
import { count } from "drizzle-orm";
import { getL113Batches } from "@/lib/l113Data";
import { formatL113Date } from "@/lib/l113";
import { createL113Batch } from "./actions";
import { Card, CardHeader, L113Header, l113Input, l113PrimaryButton } from "../ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function L113BatchesPage() {
  const [batches, counts] = await Promise.all([
    getL113Batches(),
    db.select({ batchId: l113BatchStudents.batchId, n: count() }).from(l113BatchStudents).groupBy(l113BatchStudents.batchId),
  ]);
  const studentCount = new Map(counts.map((c) => [c.batchId, c.n]));

  return (
    <>
      <L113Header title="Batches" description="Leadership 113 class batches and their students." />

      <Card>
        <CardHeader title="Batches" subtitle={`${batches.length} batch${batches.length === 1 ? "" : "es"}`} />
        {batches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Start Date</th>
                  <th className="px-4 py-2 text-left font-medium">End Date</th>
                  <th className="px-4 py-2 text-right font-medium">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/l113-portal/batches/${b.id}`} className="font-medium text-indigo-700 hover:underline">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{formatL113Date(b.startDate)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{formatL113Date(b.endDate)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{studentCount.get(b.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No batches yet.</p>
        )}

        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">Create Batch</p>
          <form action={createL113Batch} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input name="name" required placeholder="e.g. L113 Batch 1 2027" className={l113Input} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input type="date" name="startDate" required className={l113Input} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input type="date" name="endDate" required className={l113Input} />
            </div>
            <SubmitButton label="Create" pendingLabel="Creating…" className={l113PrimaryButton} />
          </form>
        </div>
      </Card>
    </>
  );
}

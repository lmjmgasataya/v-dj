import { db } from "@/db";
import { batches } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SmsSenderClient } from "./SmsSenderClient";

export default async function SmsSenderPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const batchList = await db
    .select({
      id: batches.id,
      name: batches.name,
      classStartDate: batches.classStartDate,
      isDefault: batches.isDefault,
    })
    .from(batches)
    .orderBy(desc(batches.classStartDate));

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 py-8 px-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Developer only</p>
        <h2 className="text-2xl font-bold text-gray-900">SMS Sender</h2>
      </div>
      <SmsSenderClient batches={batchList} />
    </div>
  );
}

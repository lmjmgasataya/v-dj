import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups } from "@/db/schema";
import { ilike, or, desc, isNull, and, inArray } from "drizzle-orm";
import Link from "next/link";
import { VGLeaderTable } from "./VGLeaderTable";

export default async function VGLeadersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  const rows = q.trim()
    ? await db
        .select()
        .from(victoryGroupLeaders)
        .where(
          and(
            isNull(victoryGroupLeaders.deletedAt),
            or(
              ilike(victoryGroupLeaders.lastName, `%${q}%`),
              ilike(victoryGroupLeaders.firstName, `%${q}%`),
              ilike(victoryGroupLeaders.mobileNumber, `%${q}%`)
            )
          )
        )
        .orderBy(victoryGroupLeaders.lastName)
    : await db
        .select()
        .from(victoryGroupLeaders)
        .where(isNull(victoryGroupLeaders.deletedAt))
        .orderBy(desc(victoryGroupLeaders.id));

  const leaderIds = rows.map((r) => r.id);
  const groupsList = leaderIds.length > 0
    ? await db
        .select()
        .from(victoryGroups)
        .where(and(inArray(victoryGroups.vgLeaderId, leaderIds), isNull(victoryGroups.deletedAt)))
        .orderBy(victoryGroups.createdAt)
    : [];

  const groupsByLeader = groupsList.reduce<Record<number, typeof groupsList>>((acc, g) => {
    if (!acc[g.vgLeaderId]) acc[g.vgLeaderId] = [];
    acc[g.vgLeaderId].push(g);
    return acc;
  }, {});

  const total = rows.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">VG Leaders</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">← Home</Link>
          <Link
            href="/vg-leaders/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Add Leader
          </Link>
        </div>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or mobile number..."
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
        >
          Search
        </button>
        {q && (
          <Link
            href="/vg-leaders"
            className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">{q ? `No results for "${q}".` : "No VG leaders added yet."}</p>
      ) : (
        <VGLeaderTable rows={rows} groupsByLeader={groupsByLeader} />
      )}
    </div>
  );
}

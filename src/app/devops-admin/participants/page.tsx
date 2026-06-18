import { db } from "@/db";
import { participants } from "@/db/schema";
import { desc, ilike, or, isNull, isNotNull, and, count } from "drizzle-orm";
import Link from "next/link";
import { SearchInput } from "./SearchInput";
import { archiveParticipant, restoreParticipant, deleteParticipant } from "./actions";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";
import { toTitleCase } from "@/lib/text";

const PAGE_SIZE = 10;

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const searchFilter = q.trim()
    ? or(
        ilike(participants.lastName, `%${q.trim()}%`),
        ilike(participants.firstName, `%${q.trim()}%`),
        ilike(participants.mobileNumber, `%${q.trim()}%`)
      )
    : undefined;

  const activeWhere = and(isNull(participants.deletedAt), searchFilter);

  const [{ total }] = await db.select({ total: count() }).from(participants).where(activeWhere);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const rows = await db
    .select({
      id: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      mobileNumber: participants.mobileNumber,
      registrationFee: participants.registrationFee,
      createdAt: participants.createdAt,
    })
    .from(participants)
    .where(activeWhere)
    .orderBy(desc(participants.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const archived = await db
    .select({
      id: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      mobileNumber: participants.mobileNumber,
    })
    .from(participants)
    .where(isNotNull(participants.deletedAt))
    .orderBy(desc(participants.createdAt))
    .limit(50);

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Participants</h3>
          <span className="text-xs text-gray-400">{total} active</span>
        </div>

        <div className="px-6 py-3 border-b border-gray-100">
          <SearchInput key={q} defaultValue={q} />
        </div>

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">ID</th>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Mobile</th>
                  <th className="px-4 py-2 text-left font-medium">Fee</th>
                  <th className="px-4 py-2 text-left font-medium">Registered</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{p.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      <Link href={`/participants/${p.id}/edit`} className="hover:text-indigo-600 transition">
                        {toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{p.mobileNumber ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.registrationFee ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {p.createdAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <form action={archiveParticipant}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition">Archive</button>
                        </form>
                        <ConfirmDeleteButton
                          action={deleteParticipant}
                          hiddenFields={{ id: String(p.id) }}
                          message={`Delete participant "${toTitleCase(p.lastName)}, ${toTitleCase(p.firstName)}"?`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">
            {q ? `No results for "${q}".` : "No participants yet."}
          </p>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildHref(page - 1)} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">
                  Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildHref(page + 1)} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {archived.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-500">Archived Participants</h3>
            <span className="text-xs text-gray-400">{archived.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {archived.map((p) => (
                  <tr key={p.id} className="opacity-60 hover:opacity-100 transition-opacity">
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{p.id}</td>
                    <td className="px-4 py-2.5 text-gray-500">{toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}</td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{p.mobileNumber ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <form action={restoreParticipant}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition">Restore</button>
                        </form>
                        <ConfirmDeleteButton
                          action={deleteParticipant}
                          hiddenFields={{ id: String(p.id) }}
                          message={`Delete participant "${toTitleCase(p.lastName)}, ${toTitleCase(p.firstName)}"?`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

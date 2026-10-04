import { db } from "@/db";
import { victoryGroupLeaders } from "@/db/schema";
import { isNotNull, desc } from "drizzle-orm";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { toTitleCase } from "@/lib/text";
import { getRemainingConnections } from "./connections";
import { HardDeleteButton } from "./HardDeleteButton";
import { RemoveConnectionsButton } from "./RemoveConnectionsButton";
import { RestoreButton } from "./RestoreButton";

function fmtDateTime(d: Date) {
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

export default async function DeletedVgLeadersPage() {
  const rows = await db
    .select()
    .from(victoryGroupLeaders)
    .where(isNotNull(victoryGroupLeaders.deletedAt))
    .orderBy(desc(victoryGroupLeaders.deletedAt));

  const connectionsById = await getRemainingConnections(rows.map((r) => r.id));
  const withConnections = rows.filter((r) => (connectionsById.get(r.id) ?? []).length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "VG Leader Portal", href: "/vg-leader-portal" },
            { label: "VG Leaders", href: "/vg-leader-portal/leaders" },
            { label: "Deleted" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Deleted VG Leaders</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {rows.length} record{rows.length !== 1 ? "s" : ""}
          {withConnections > 0 && ` · ${withConnections} still with connections`}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Restore a record to undo its deletion. A record can only be deleted permanently once nothing references it anymore — remove its connections first.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No deleted VG leaders.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((l) => {
            const name = `${toTitleCase(l.lastName)}, ${toTitleCase(l.firstName)}`;
            const connections = connectionsById.get(l.id) ?? [];
            return (
              <div
                key={l.id}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/vg-leader-portal/leaders/${l.id}`}
                    className="font-semibold text-gray-900 hover:text-indigo-700 hover:underline"
                  >
                    {name} <span className="font-normal text-gray-400">#{l.id}</span>
                  </Link>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[l.mobileNumber, l.serviceAttending].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="text-xs text-red-400 mt-1">Deleted {fmtDateTime(l.deletedAt!)}</p>

                  <div className="mt-2 text-xs text-gray-600">
                    {connections.length === 0 ? (
                      <p className="text-green-700">No remaining connections.</p>
                    ) : (
                      <dl className="flex flex-col gap-1">
                        {connections.map((c) => (
                          <div key={c.label}>
                            <dt className="inline font-medium text-gray-700">{c.label} ({c.items.length}): </dt>
                            <dd className="inline">
                              {c.items.map((item, i) => (
                                <span key={item.key}>
                                  {i > 0 && "; "}
                                  {item.href ? (
                                    <Link href={item.href} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                                      {item.label}
                                    </Link>
                                  ) : (
                                    item.label
                                  )}
                                </span>
                              ))}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <RestoreButton id={l.id} name={name} />
                  {connections.length > 0 && <RemoveConnectionsButton id={l.id} name={name} />}
                  <HardDeleteButton id={l.id} name={name} disabled={connections.length > 0} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

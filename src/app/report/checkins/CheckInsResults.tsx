import { db } from "@/db";
import { checkIns, participants, sessionVglCheckIns, victoryGroupLeaders } from "@/db/schema";
import { and, count, eq, inArray, max, min, ne, sql } from "drizzle-orm";
import { CheckInsChart } from "./CheckInsChart";
import { CHECKIN_WINDOW_OPTIONS, DEFAULT_CHECKIN_WINDOW_MINUTES } from "@/lib/constants";

/**
 * The session's check-ins as one (checkedInAt, status) list: VGL-only sessions record VG leaders
 * in sessionVglCheckIns, every other session records participants in checkIns.
 */
function sessionCheckIns(sessionId: number, vglOnly: boolean, lockedServiceRawValues?: string[]) {
  if (vglOnly) {
    return db
      .select({ checkedInAt: sessionVglCheckIns.checkedInAt, status: sessionVglCheckIns.status })
      .from(sessionVglCheckIns)
      .innerJoin(victoryGroupLeaders, eq(sessionVglCheckIns.vgLeaderId, victoryGroupLeaders.id))
      .where(
        and(
          eq(sessionVglCheckIns.classSessionId, sessionId),
          lockedServiceRawValues ? inArray(victoryGroupLeaders.serviceAttending, lockedServiceRawValues) : undefined
        )
      )
      .as("session_check_ins");
  }
  return db
    .select({ checkedInAt: checkIns.checkedInAt, status: checkIns.status })
    .from(checkIns)
    .innerJoin(participants, eq(checkIns.participantId, participants.id))
    .where(
      and(
        eq(checkIns.classSessionId, sessionId),
        lockedServiceRawValues ? inArray(participants.serviceAttending, lockedServiceRawValues) : undefined
      )
    )
    .as("session_check_ins");
}

export async function CheckInsResults({
  sessionId,
  vglOnly,
  windowMinutes,
  lockedServiceRawValues,
}: {
  sessionId: number;
  vglOnly: boolean;
  windowMinutes: number;
  lockedServiceRawValues?: string[];
}) {
  const minutes = CHECKIN_WINDOW_OPTIONS.includes(windowMinutes) ? windowMinutes : DEFAULT_CHECKIN_WINDOW_MINUTES;
  const bucket = sql.raw(String(minutes));

  const c = sessionCheckIns(sessionId, vglOnly, lockedServiceRawValues);

  const [bucketRows, summaryRows, [absentRow]] = await Promise.all([
    db
      .select({
        time: sql<string>`to_char(
          date_trunc('hour', ${c.checkedInAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') +
          floor(extract(minute from ${c.checkedInAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') / ${bucket}) * interval '${bucket} minutes',
          'HH12:MI AM'
        )`,
        sortKey: sql<string>`date_trunc('hour', ${c.checkedInAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') +
          floor(extract(minute from ${c.checkedInAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') / ${bucket}) * interval '${bucket} minutes'`,
        count: count(),
      })
      .from(c)
      .where(ne(c.status, "Absent"))
      .groupBy(sql`1, 2`)
      .orderBy(sql`2`),

    db
      .select({
        total: count(),
        first: min(c.checkedInAt),
        last: max(c.checkedInAt),
      })
      .from(c)
      .where(ne(c.status, "Absent")),

    db
      .select({ absent: count() })
      .from(c)
      .where(eq(c.status, "Absent")),
  ]);

  const buckets = bucketRows.map((r) => ({ time: r.time, count: r.count }));

  const peakBucket = bucketRows.reduce(
    (best, r) => (r.count > (best?.count ?? 0) ? r : best),
    null as (typeof bucketRows)[number] | null
  );

  const fmt = (d: Date | null) =>
    d
      ? new Date(d).toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        })
      : null;

  const stats = {
    total: summaryRows[0]?.total ?? 0,
    first: fmt(summaryRows[0]?.first ?? null),
    last: fmt(summaryRows[0]?.last ?? null),
    peak: peakBucket ? `${peakBucket.time} (${peakBucket.count})` : null,
    absent: absentRow?.absent ?? 0,
  };

  return (
    <>
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Check-ins", value: stats.total },
            { label: "First Check-in", value: stats.first ?? "—" },
            { label: "Last Check-in", value: stats.last ?? "—" },
            { label: "Busiest Window", value: stats.peak ?? "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4"
            >
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                {label}
              </p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{value}</p>
            </div>
          ))}
          {stats.absent > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Absent</p>
              <p className="text-xl font-bold text-red-500 mt-1">{stats.absent}</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">
          Check-ins by {minutes}-minute window
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Filled dot = peak window
        </p>
        <CheckInsChart data={buckets} />
      </div>
    </>
  );
}

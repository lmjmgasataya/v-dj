import { db } from "@/db";
import { participants, disciplers, victoryGroupLeaders } from "@/db/schema";
import { ilike, or, desc, isNull, and, count, gte, lt, eq, inArray, getTableColumns } from "drizzle-orm";
import Link from "next/link";
import { ParticipantTable } from "./ParticipantTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { checkIns, classSessions } from "@/db/schema";
import { currentYearPH } from "@/lib/date";
import { getSession } from "@/lib/auth";

const PAGE_SIZE = 20;

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const [{ q = "", page: pageParam }, session] = await Promise.all([searchParams, getSession()]);
  const isDeveloper = session?.role === "developer";

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const extraCols = {
    disciplerLastName: disciplers.lastName,
    disciplerFirstName: disciplers.firstName,
    disciplerMobileNumber: disciplers.mobileNumber,
    disciplerMessengerName: disciplers.messengerName,
    vgLeaderLastName: victoryGroupLeaders.lastName,
    vgLeaderFirstName: victoryGroupLeaders.firstName,
    vgLeaderMobileNumber: victoryGroupLeaders.mobileNumber,
    vgLeaderMessengerName: victoryGroupLeaders.facebookMessengerName,
  };

  const baseWhere = q.trim()
    ? and(
        isNull(participants.deletedAt),
        or(
          ilike(participants.lastName, `%${q}%`),
          ilike(participants.firstName, `%${q}%`),
          ilike(participants.mobileNumber, `%${q}%`)
        )
      )
    : isNull(participants.deletedAt);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ ...getTableColumns(participants), ...extraCols })
      .from(participants)
      .leftJoin(disciplers, eq(participants.disciplerId, disciplers.id))
      .leftJoin(victoryGroupLeaders, eq(participants.vgLeaderId, victoryGroupLeaders.id))
      .where(baseWhere)
      .orderBy(q.trim() ? participants.lastName : desc(participants.id))
      .limit(PAGE_SIZE)
      .offset(offset),

    db
      .select({ total: count() })
      .from(participants)
      .where(baseWhere),
  ]);

  const participantIds = rows.map((r) => r.id);
  const year = currentYearPH();

  const [attendanceList, [{ totalVictoryDaySessions }]] = await Promise.all([
    participantIds.length > 0
      ? db
          .select({
            participantId: checkIns.participantId,
            sessionName: classSessions.name,
            sessionDate: classSessions.sessionDate,
            isVictoryDay: classSessions.isVictoryDay,
          })
          .from(checkIns)
          .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
          .where(inArray(checkIns.participantId, participantIds))
          .orderBy(classSessions.sessionDate)
      : Promise.resolve([]),

    db
      .select({ totalVictoryDaySessions: count() })
      .from(classSessions)
      .where(
        and(
          eq(classSessions.isVictoryDay, true),
          gte(classSessions.sessionDate, `${year}-01-01`),
          lt(classSessions.sessionDate, `${year + 1}-01-01`)
        )
      ),
  ]);

  const attendanceByParticipant = attendanceList.reduce<
    Record<number, { sessionName: string; sessionDate: string }[]>
  >((acc, row) => {
    if (!acc[row.participantId]) acc[row.participantId] = [];
    acc[row.participantId].push({ sessionName: row.sessionName, sessionDate: row.sessionDate });
    return acc;
  }, {});

  const victoryDayMap = attendanceList.reduce<Record<number, string>>((acc, row) => {
    if (row.isVictoryDay) acc[row.participantId] = row.sessionDate;
    return acc;
  }, {});

  const victoryDayCountByParticipant = attendanceList.reduce<Record<number, number>>((acc, row) => {
    if (row.isVictoryDay) acc[row.participantId] = (acc[row.participantId] ?? 0) + 1;
    return acc;
  }, {});

  const completedVictoryDayMap = Object.fromEntries(
    Object.entries(victoryDayCountByParticipant).map(([id, c]) => [id, c >= totalVictoryDaySessions])
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/participants${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Participants" }]} />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
            <p className="text-sm text-gray-500 mt-0.5">{total} record{total !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/participants/export"
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <span>↓</span> Export Excel
            </a>
            <Link href="/participants/deleted" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">View deleted</Link>
          </div>
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
            href="/participants"
            className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">{q ? `No results for "${q}".` : "No participants registered yet."}</p>
      ) : (
        <>
          <ParticipantTable rows={rows} attendance={attendanceByParticipant} victoryDayDates={victoryDayMap} completedVictoryDays={completedVictoryDayMap} showEdit={isDeveloper} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-300 font-medium cursor-not-allowed">
                    ← Previous
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={pageHref(page + 1)}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-300 font-medium cursor-not-allowed">
                    Next →
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

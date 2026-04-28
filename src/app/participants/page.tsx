import { db } from "@/db";
import { participants } from "@/db/schema";
import { ilike, or, desc, isNull, and, count, gte, lt } from "drizzle-orm";
import Link from "next/link";
import { ParticipantTable } from "./ParticipantTable";
import { checkIns, classSessions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  const rows = q.trim()
    ? await db
        .select()
        .from(participants)
        .where(
          and(
            isNull(participants.deletedAt),
            or(
              ilike(participants.lastName, `%${q}%`),
              ilike(participants.firstName, `%${q}%`),
              ilike(participants.mobileNumber, `%${q}%`)
            )
          )
        )
        .orderBy(participants.lastName)
    : await db
        .select()
        .from(participants)
        .where(isNull(participants.deletedAt))
        .orderBy(desc(participants.id));

  const participantIds = rows.map((r) => r.id);
  const attendanceList =
    participantIds.length > 0
      ? await db
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
      : [];

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

  const year = new Date().getFullYear();
  const [{ totalVictoryDaySessions }] = await db
    .select({ totalVictoryDaySessions: count() })
    .from(classSessions)
    .where(
      and(
        eq(classSessions.isVictoryDay, true),
        gte(classSessions.sessionDate, `${year}-01-01`),
        lt(classSessions.sessionDate, `${year + 1}-01-01`)
      )
    );

  const completedVictoryDayMap = Object.fromEntries(
    Object.entries(victoryDayCountByParticipant).map(([id, c]) => [id, c >= totalVictoryDaySessions])
  );

  const total = rows.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">← Home</Link>
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
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
        <ParticipantTable rows={rows} attendance={attendanceByParticipant} victoryDayDates={victoryDayMap} completedVictoryDays={completedVictoryDayMap} />
      )}
    </div>
  );
}

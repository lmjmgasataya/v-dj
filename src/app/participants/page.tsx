import { db } from "@/db";
import { participants, walkIns, classSessions, checkIns } from "@/db/schema";
import { ilike, or, desc, isNull, and, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { ParticipantTable } from "./ParticipantTable";
import { WalkInTable } from "./WalkInTable";

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

  const walkInRows = q.trim()
    ? await db
        .select({
          id: walkIns.id,
          classSessionId: walkIns.classSessionId,
          lastName: walkIns.lastName,
          firstName: walkIns.firstName,
          middleInitial: walkIns.middleInitial,
          age: walkIns.age,
          gender: walkIns.gender,
          serviceAttending: walkIns.serviceAttending,
          facebookMessengerName: walkIns.facebookMessengerName,
          vgLeaderLastName: walkIns.vgLeaderLastName,
          vgLeaderFirstName: walkIns.vgLeaderFirstName,
          victoryDate: walkIns.victoryDate,
          createdAt: walkIns.createdAt,
          sessionName: classSessions.name,
        })
        .from(walkIns)
        .leftJoin(classSessions, eq(walkIns.classSessionId, classSessions.id))
        .where(
          or(
            ilike(walkIns.lastName, `%${q}%`),
            ilike(walkIns.firstName, `%${q}%`)
          )
        )
        .orderBy(walkIns.lastName)
    : await db
        .select({
          id: walkIns.id,
          classSessionId: walkIns.classSessionId,
          lastName: walkIns.lastName,
          firstName: walkIns.firstName,
          middleInitial: walkIns.middleInitial,
          age: walkIns.age,
          gender: walkIns.gender,
          serviceAttending: walkIns.serviceAttending,
          facebookMessengerName: walkIns.facebookMessengerName,
          vgLeaderLastName: walkIns.vgLeaderLastName,
          vgLeaderFirstName: walkIns.vgLeaderFirstName,
          victoryDate: walkIns.victoryDate,
          createdAt: walkIns.createdAt,
          sessionName: classSessions.name,
        })
        .from(walkIns)
        .leftJoin(classSessions, eq(walkIns.classSessionId, classSessions.id))
        .orderBy(desc(walkIns.id));

  const total = rows.length + walkInRows.length;

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

      {/* Registered participants */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          Registered — {rows.length} record{rows.length !== 1 ? "s" : ""}
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400">{q ? `No registered participants found for "${q}".` : "No participants registered yet."}</p>
        ) : (
          <ParticipantTable rows={rows} attendance={attendanceByParticipant} />
        )}
      </div>

      {/* Walk-ins */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          Walk-ins — {walkInRows.length} record{walkInRows.length !== 1 ? "s" : ""}
        </p>
        {walkInRows.length === 0 ? (
          <p className="text-sm text-gray-400">{q ? `No walk-ins found for "${q}".` : "No walk-ins recorded yet."}</p>
        ) : (
          <WalkInTable rows={walkInRows} />
        )}
      </div>
    </div>
  );
}

import { db } from "@/db";
import { participants, disciplers, victoryGroupLeaders, checkIns, classSessions } from "@/db/schema";
import { ilike, or, isNull, and, count, gte, lt, eq, inArray, getTableColumns } from "drizzle-orm";
import Link from "next/link";
import { ParticipantTable } from "./ParticipantTable";
import { currentYearPH } from "@/lib/date";

const PAGE_SIZE = 20;

export function ParticipantListSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 animate-pulse">
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-48 rounded bg-gray-200" />
            <div className="h-3 w-36 rounded bg-gray-100" />
          </div>
          <div className="h-4 w-4 rounded bg-gray-100 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export async function ParticipantList({
  q,
  lifestage,
  fee,
  gender,
  service,
  page,
  isDeveloper,
}: {
  q: string;
  lifestage: string;
  fee: string;
  gender: string;
  service: string;
  page: number;
  isDeveloper: boolean;
}) {
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

  const baseWhere = and(
    isNull(participants.deletedAt),
    q.trim() ? or(
      ilike(participants.lastName, `%${q}%`),
      ilike(participants.firstName, `%${q}%`),
      ilike(participants.mobileNumber, `%${q}%`)
    ) : undefined,
    lifestage ? eq(participants.lifestage, lifestage as "Student (JHS/SHS)" | "Student (College)" | "Single" | "Married" | "Single Parent" | "Widow/Widower" | "Senior") : undefined,
    fee ? eq(participants.registrationFee, fee) : undefined,
    gender ? eq(participants.gender, gender) : undefined,
    service ? eq(participants.serviceAttending, service) : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ ...getTableColumns(participants), ...extraCols })
      .from(participants)
      .leftJoin(disciplers, eq(participants.disciplerId, disciplers.id))
      .leftJoin(victoryGroupLeaders, eq(participants.vgLeaderId, victoryGroupLeaders.id))
      .where(baseWhere)
      .orderBy(participants.id)
      .limit(PAGE_SIZE)
      .offset(offset),

    db.select({ total: count() }).from(participants).where(baseWhere),
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
    if (lifestage) params.set("lifestage", lifestage);
    if (fee) params.set("fee", fee);
    if (gender) params.set("gender", gender);
    if (service) params.set("service", service);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/participants${qs ? `?${qs}` : ""}`;
  }

  if (rows.length === 0) {
    const hasFilters = q || lifestage || fee || gender || service;
    return (
      <p className="text-sm text-gray-400">{hasFilters ? "No participants match the current filters." : "No participants registered yet."}</p>
    );
  }

  return (
    <>
      <p className="text-sm text-gray-500">{total} record{total !== 1 ? "s" : ""}</p>

      <ParticipantTable
        rows={rows}
        attendance={attendanceByParticipant}
        victoryDayDates={victoryDayMap}
        completedVictoryDays={completedVictoryDayMap}
        showEdit={isDeveloper}
      />

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
  );
}

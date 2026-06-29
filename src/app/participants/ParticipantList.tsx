import { db } from "@/db";
import { participants, disciplers, victoryGroupLeaders, checkIns, classSessions } from "@/db/schema";
import { ilike, or, isNull, isNotNull, and, count, gte, lt, eq, inArray, getTableColumns, desc } from "drizzle-orm";
import Link from "next/link";
import { ParticipantTable } from "./ParticipantTable";
import { currentYearPH } from "@/lib/date";

const PAGE_SIZE = 20;

export function ParticipantListSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2.5 flex gap-6 animate-pulse">
        {[120, 88, 96, 48, 64, 80, 72].map((w, i) => (
          <div key={i} className="h-3 rounded bg-gray-200" style={{ width: w }} />
        ))}
      </div>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex gap-6 px-3 py-3 border-b border-gray-100 animate-pulse">
          <div className="h-4 w-36 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-100" />
          <div className="h-4 w-28 rounded bg-gray-100" />
          <div className="h-4 w-12 rounded bg-gray-100" />
          <div className="h-4 w-16 rounded bg-gray-100" />
          <div className="h-4 w-20 rounded bg-gray-100" />
          <div className="h-4 w-20 rounded bg-gray-100" />
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
  previousChurch,
  waterBaptism,
  victoryWeekend,
  page,
  isDeveloper,
}: {
  q: string;
  lifestage: string;
  fee: string;
  gender: string;
  service: string;
  previousChurch: string;
  waterBaptism: string;
  victoryWeekend: string;
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
    previousChurch.trim() ? ilike(participants.previousChurch, `%${previousChurch}%`) : undefined,
    waterBaptism === "yes" ? eq(participants.willUndergoWaterBaptism, true) : waterBaptism === "no" ? eq(participants.willUndergoWaterBaptism, false) : undefined,
    victoryWeekend === "done"
      ? or(eq(participants.isDoneWithVictoryWeekend, true), isNotNull(participants.victoryDate))
      : victoryWeekend === "not_done"
        ? and(or(eq(participants.isDoneWithVictoryWeekend, false), isNull(participants.isDoneWithVictoryWeekend)), isNull(participants.victoryDate))
        : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ ...getTableColumns(participants), ...extraCols })
      .from(participants)
      .leftJoin(disciplers, eq(participants.disciplerId, disciplers.id))
      .leftJoin(victoryGroupLeaders, eq(participants.vgLeaderId, victoryGroupLeaders.id))
      .where(baseWhere)
      .orderBy(desc(participants.createdAt))
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
    if (previousChurch) params.set("previousChurch", previousChurch);
    if (waterBaptism) params.set("waterBaptism", waterBaptism);
    if (victoryWeekend) params.set("victoryWeekend", victoryWeekend);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/participants${qs ? `?${qs}` : ""}`;
  }

  if (rows.length === 0) {
    const hasFilters = q || lifestage || fee || gender || service || previousChurch || waterBaptism || victoryWeekend;
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

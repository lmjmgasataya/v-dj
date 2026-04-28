import { db } from "@/db";
import { classSessions, checkIns, participants } from "@/db/schema";
import { and, count, eq, gte, inArray, lt } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AttendeeList } from "./AttendeeList";
import { getSession } from "@/lib/auth";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  const [session] = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);

  if (!session) notFound();

  const authSession = await getSession();
  const isDeveloper = authSession?.role === "developer";

  const attendees = await db
    .select({
      checkInId: checkIns.id,
      checkedInAt: checkIns.checkedInAt,
      participantId: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      middleInitial: participants.middleInitial,
      mobileNumber: participants.mobileNumber,
      facebookMessengerName: participants.facebookMessengerName,
      lifestage: participants.lifestage,
      age: participants.age,
      gender: participants.gender,
      serviceAttending: participants.serviceAttending,
      preferredNameOnId: participants.preferredNameOnId,
      registrationFee: participants.registrationFee,
      acknowledgementReceiptNumber: participants.acknowledgementReceiptNumber,
      completedOne2One: participants.completedOne2One,
      willUndergoWaterBaptism: participants.willUndergoWaterBaptism,
      previousChurch: participants.previousChurch,
      disciplerLastName: participants.disciplerLastName,
      disciplerFirstName: participants.disciplerFirstName,
      disciplerMobileNumber: participants.disciplerMobileNumber,
      disciplerMessengerName: participants.disciplerMessengerName,
      isWalkIn: participants.isWalkIn,
      vgLeaderLastName: participants.vgLeaderLastName,
      vgLeaderFirstName: participants.vgLeaderFirstName,
      victoryDate: participants.victoryDate,
    })
    .from(checkIns)
    .innerJoin(participants, eq(checkIns.participantId, participants.id))
    .where(eq(checkIns.classSessionId, sessionId))
    .orderBy(checkIns.checkedInAt);

  const participantIds = attendees.map((a) => a.participantId);
  const victoryCheckIns =
    participantIds.length > 0
      ? await db
          .select({ participantId: checkIns.participantId, sessionDate: classSessions.sessionDate })
          .from(checkIns)
          .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
          .where(and(inArray(checkIns.participantId, participantIds), eq(classSessions.isVictoryDay, true)))
      : [];
  const victoryDayMap: Record<number, string> = {};
  const victoryCountMap: Record<number, number> = {};
  for (const v of victoryCheckIns) {
    victoryDayMap[v.participantId] ??= v.sessionDate;
    victoryCountMap[v.participantId] = (victoryCountMap[v.participantId] ?? 0) + 1;
  }

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

  const attendeesWithVictoryDay = attendees.map((a) => ({
    ...a,
    victoryDayDate: victoryDayMap[a.participantId] ?? null,
    completedVictoryDay: a.isWalkIn ? true : (victoryCountMap[a.participantId] ?? 0) >= totalVictoryDaySessions,
  }));

  const dateStr = new Date(session.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/sessions" className="text-sm text-indigo-600 hover:underline">← Sessions</Link>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-2xl font-bold text-gray-900">{session.name}</h2>
            {isDeveloper && (
              <Link href={`/sessions/${sessionId}/edit`} className="text-xs text-gray-400 hover:text-indigo-600 underline underline-offset-2">
                Edit
              </Link>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <p className="text-3xl font-bold text-indigo-600">{attendees.length}</p>
            <p className="text-sm text-gray-400">checked in</p>
          </div>
          {attendees.length > 0 && (
            <a
              href={`/api/sessions/${sessionId}/export`}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <span>↓</span> Export Excel
            </a>
          )}
        </div>
      </div>

      {attendees.length === 0 ? (
        <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 bg-white">
          No check-ins recorded for this session yet.
        </div>
      ) : (
        <AttendeeList attendees={attendeesWithVictoryDay} />
      )}
    </div>
  );
}

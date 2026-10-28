import { db } from "@/db";
import { classSessions, checkIns, participants, victoryGroupLeaders, sessionVglCheckIns, users, type ClassSession } from "@/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AttendeeList } from "./AttendeeList";
import { VglAttendeeList } from "./VglAttendeeList";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getVictoryDayTotalsByBatch, victoryDayTotalFor } from "@/lib/batchCheckIn";
import { rawServiceValues } from "@/lib/timeService";

const disciplerLeaders = alias(victoryGroupLeaders, "discipler_leaders");

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  const authSession = await getSession();
  const isLeadPastor = authSession?.role === "lead_pastor";
  const lockedServiceRawValues = isLeadPastor ? rawServiceValues(authSession?.timeService) : undefined;

  const [[session], attendees, vglAttendees] = await Promise.all([
    db
      .select()
      .from(classSessions)
      .where(eq(classSessions.id, sessionId))
      .limit(1),

    db
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
        disciplerLastName: disciplerLeaders.lastName,
        disciplerFirstName: disciplerLeaders.firstName,
        disciplerMobileNumber: disciplerLeaders.mobileNumber,
        disciplerMessengerName: disciplerLeaders.facebookMessengerName,
        isWalkIn: participants.isWalkIn,
        batchId: participants.batchId,
        vgLeaderLastName: victoryGroupLeaders.lastName,
        vgLeaderFirstName: victoryGroupLeaders.firstName,
        victoryDate: participants.victoryDate,
        remarks: checkIns.remarks,
        tableNumber: checkIns.tableNumber,
        status: checkIns.status,
        method: checkIns.method,
      })
      .from(checkIns)
      .innerJoin(participants, eq(checkIns.participantId, participants.id))
      .leftJoin(disciplerLeaders, eq(participants.disciplerId, disciplerLeaders.id))
      .leftJoin(victoryGroupLeaders, eq(participants.vgLeaderId, victoryGroupLeaders.id))
      .where(
        and(
          eq(checkIns.classSessionId, sessionId),
          lockedServiceRawValues ? inArray(participants.serviceAttending, lockedServiceRawValues) : undefined
        )
      )
      .orderBy(checkIns.checkedInAt),

    db
      .select({
        checkInId: sessionVglCheckIns.id,
        checkedInAt: sessionVglCheckIns.checkedInAt,
        vgLeaderId: victoryGroupLeaders.id,
        lastName: victoryGroupLeaders.lastName,
        firstName: victoryGroupLeaders.firstName,
        middleInitial: victoryGroupLeaders.middleInitial,
        nickname: victoryGroupLeaders.nickname,
        mobileNumber: victoryGroupLeaders.mobileNumber,
        serviceAttending: victoryGroupLeaders.serviceAttending,
        // Claimed = has a portal account (a PIN reset still counts), same as the VG Leader Portal.
        claimedAndCompleted: sql<boolean>`(${users.id} is not null and ${victoryGroupLeaders.profileCompleted})`,
        remarks: sessionVglCheckIns.remarks,
        status: sessionVglCheckIns.status,
        method: sessionVglCheckIns.method,
      })
      .from(sessionVglCheckIns)
      .innerJoin(victoryGroupLeaders, eq(sessionVglCheckIns.vgLeaderId, victoryGroupLeaders.id))
      .leftJoin(users, eq(users.vgLeaderId, victoryGroupLeaders.id))
      .where(
        and(
          eq(sessionVglCheckIns.classSessionId, sessionId),
          lockedServiceRawValues ? inArray(victoryGroupLeaders.serviceAttending, lockedServiceRawValues) : undefined
        )
      )
      .orderBy(sessionVglCheckIns.checkedInAt),
  ]);

  if (!session) notFound();

  const isDeveloper = authSession?.role === "developer";

  if (session.vglOnly) {
    return (
      <SessionDetailLayout
        session={session}
        isDeveloper={isDeveloper}
        badge="VGLs Only"
        attendedCount={vglAttendees.filter((a) => a.status !== "Absent").length}
        absentCount={vglAttendees.filter((a) => a.status === "Absent").length}
        hasAttendees={vglAttendees.length > 0}
      >
        <VglAttendeeList attendees={vglAttendees} />
      </SessionDetailLayout>
    );
  }

  const participantIds = attendees.map((a) => a.participantId);

  const [victoryCheckIns, victoryDayTotals] = await Promise.all([
    participantIds.length > 0
      ? db
          .select({ participantId: checkIns.participantId, sessionDate: classSessions.sessionDate })
          .from(checkIns)
          .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
          .where(and(inArray(checkIns.participantId, participantIds), eq(classSessions.isVictoryDay, true), ne(checkIns.status, "Absent")))
      : Promise.resolve([]),

    getVictoryDayTotalsByBatch(),
  ]);

  const victoryDayMap: Record<number, string> = {};
  const victoryCountMap: Record<number, number> = {};
  for (const v of victoryCheckIns) {
    victoryDayMap[v.participantId] ??= v.sessionDate;
    victoryCountMap[v.participantId] = (victoryCountMap[v.participantId] ?? 0) + 1;
  }

  const attendeesWithVictoryDay = attendees.map(({ batchId, ...a }) => {
    const totalVictoryDaySessions = victoryDayTotalFor(victoryDayTotals, batchId);
    return {
      ...a,
      victoryDayDate: victoryDayMap[a.participantId] ?? null,
      victoryDayCount: victoryCountMap[a.participantId] ?? 0,
      totalVictoryDaySessions,
      completedVictoryDay: a.isWalkIn ? true : (victoryCountMap[a.participantId] ?? 0) >= totalVictoryDaySessions,
    };
  });

  const attendedCount = attendees.filter((a) => a.status !== "Absent").length;
  const absentCount = attendees.length - attendedCount;

  return (
    <SessionDetailLayout
      session={session}
      isDeveloper={isDeveloper}
      attendedCount={attendedCount}
      absentCount={absentCount}
      hasAttendees={attendees.length > 0}
    >
      <AttendeeList attendees={attendeesWithVictoryDay} />
    </SessionDetailLayout>
  );
}

function SessionDetailLayout({
  session,
  isDeveloper,
  badge,
  attendedCount,
  absentCount,
  hasAttendees,
  children,
}: {
  session: ClassSession;
  isDeveloper: boolean;
  badge?: string;
  attendedCount: number;
  absentCount: number;
  hasAttendees: boolean;
  children: React.ReactNode;
}) {
  const dateStr = new Date(session.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Discipleship Journey Portal", href: "/journey" }, { label: "Sessions", href: "/sessions" }, { label: session.name }]} />
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{session.name}</h2>
            {badge && (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{badge}</span>
            )}
            {isDeveloper && (
              <Link href={`/sessions/${session.id}/edit`} className="text-xs text-gray-400 hover:text-indigo-600 underline underline-offset-2">
                Edit
              </Link>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <p className="text-3xl font-bold text-indigo-600">{attendedCount}</p>
            <p className="text-sm text-gray-400">checked in</p>
            {absentCount > 0 && (
              <p className="text-xs text-red-500 mt-0.5">{absentCount} absent</p>
            )}
          </div>
          {hasAttendees && (
            <a
              href={`/api/sessions/${session.id}/export`}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <span>↓</span> Export Excel
            </a>
          )}
        </div>
      </div>

      {hasAttendees ? (
        children
      ) : (
        <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 bg-white">
          No check-ins recorded for this session yet.
        </div>
      )}
    </div>
  );
}

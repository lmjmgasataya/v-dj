import { db } from "@/db";
import { participants, victoryGroupLeaders, checkIns, classSessions, batches } from "@/db/schema";
import { isNull, desc, eq, inArray, and, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as XLSX from "xlsx";
import { todayPH } from "@/lib/date";
import { getSession } from "@/lib/auth";
import { rawServiceValues } from "@/lib/timeService";

const disciplerLeaders = alias(victoryGroupLeaders, "discipler_leaders");

type AttendanceEntry = { date: string; remarks: string | null; absent: boolean };

function classKey(name: string): string {
  return name.trim().toLowerCase();
}

function uniqueByClass<T extends { name: string }>(sessions: T[]): T[] {
  const seen = new Set<string>();
  return sessions.filter((s) => {
    const key = classKey(s.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** participantId → class name → earliest check-in, preferring one that isn't Absent. */
function attendanceByClass(
  rows: { participantId: number; sessionName: string; sessionDate: string; remarks: string | null; status: string }[]
): Map<number, Map<string, AttendanceEntry>> {
  const map = new Map<number, Map<string, AttendanceEntry>>();
  for (const a of rows) {
    if (!map.has(a.participantId)) map.set(a.participantId, new Map());
    const byClass = map.get(a.participantId)!;
    const existing = byClass.get(classKey(a.sessionName));
    if (!existing || (existing.absent && a.status !== "Absent")) {
      byClass.set(classKey(a.sessionName), { date: a.sessionDate, remarks: a.remarks, absent: a.status === "Absent" });
    }
  }
  return map;
}

export async function GET(request: Request) {
  const session = await getSession();
  const isLeadPastor = session?.role === "lead_pastor";

  // Same as the Participants page: no ?batch= is the active (default) batch, ?batch=all is every batch.
  const batchParam = new URL(request.url).searchParams.get("batch");
  const [defaultBatch] = await db
    .select({ id: batches.id })
    .from(batches)
    .where(eq(batches.isDefault, true))
    .limit(1);
  const batchId = batchParam === "all" ? null : (parseInt(batchParam ?? "", 10) || defaultBatch?.id || null);

  const [rows, batchSessions, batchVictorySessions] = await Promise.all([
    db
      .select({
        ...getTableColumns(participants),
        disciplerLastName: disciplerLeaders.lastName,
        disciplerFirstName: disciplerLeaders.firstName,
        disciplerMobileNumber: disciplerLeaders.mobileNumber,
        disciplerMessengerName: disciplerLeaders.facebookMessengerName,
        vgLeaderLastName: victoryGroupLeaders.lastName,
        vgLeaderFirstName: victoryGroupLeaders.firstName,
      })
      .from(participants)
      .leftJoin(disciplerLeaders, eq(participants.disciplerId, disciplerLeaders.id))
      .leftJoin(victoryGroupLeaders, eq(participants.vgLeaderId, victoryGroupLeaders.id))
      .where(
        and(
          isNull(participants.deletedAt),
          batchId != null ? eq(participants.batchId, batchId) : undefined,
          isLeadPastor ? inArray(participants.serviceAttending, rawServiceValues(session?.timeService)) : undefined
        )
      )
      .orderBy(desc(participants.id)),

    db
      .select()
      .from(classSessions)
      .where(and(eq(classSessions.isVictoryDay, false), batchId != null ? eq(classSessions.batchId, batchId) : undefined))
      .orderBy(classSessions.sessionDate),

    db
      .select()
      .from(classSessions)
      .where(and(eq(classSessions.isVictoryDay, true), batchId != null ? eq(classSessions.batchId, batchId) : undefined))
      .orderBy(classSessions.sessionDate),
  ]);

  // One column per class name: every batch repeats the same classes, and a make-up
  // attendance in another batch's session fills the participant's own class column.
  const sessions = uniqueByClass(batchSessions);
  const victorySessions = uniqueByClass(batchVictorySessions);

  const participantIds = rows.map((r) => r.id);

  const [attendance, victoryAttendance] = await Promise.all([
    participantIds.length > 0
      ? db
          .select({
            participantId: checkIns.participantId,
            sessionName: classSessions.name,
            sessionDate: classSessions.sessionDate,
            remarks: checkIns.remarks,
            status: checkIns.status,
          })
          .from(checkIns)
          .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
          .where(
            and(
              inArray(checkIns.participantId, participantIds),
              eq(classSessions.isVictoryDay, false)
            )
          )
          .orderBy(classSessions.sessionDate)
      : Promise.resolve([]),

    participantIds.length > 0
      ? db
          .select({
            participantId: checkIns.participantId,
            sessionName: classSessions.name,
            sessionDate: classSessions.sessionDate,
            remarks: checkIns.remarks,
            status: checkIns.status,
          })
          .from(checkIns)
          .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
          .where(
            and(
              inArray(checkIns.participantId, participantIds),
              eq(classSessions.isVictoryDay, true)
            )
          )
          .orderBy(classSessions.sessionDate)
      : Promise.resolve([]),
  ]);

  const attendanceMap = attendanceByClass(attendance);
  const victoryAttendanceMap = attendanceByClass(victoryAttendance);

  const formatDate = (date: string) =>
    new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });

  // A check-in marked Absent (15+ min late) isn't attendance — same as the attendance reports.
  const cell = (entry: AttendanceEntry) =>
    (entry.absent ? "Absent" : formatDate(entry.date)) + (entry.remarks ? ` (${entry.remarks})` : "");

  const data = rows.map((p, i) => {
    const attended = attendanceMap.get(p.id) ?? new Map<string, AttendanceEntry>();
    const sessionCols: Record<string, string> = {};
    for (const s of sessions) {
      const entry = attended.get(classKey(s.name));
      sessionCols[s.name] = entry ? cell(entry) : "";
    }

    const victoryAttended = victoryAttendanceMap.get(p.id) ?? new Map<string, AttendanceEntry>();
    const earliestVictoryDate = Array.from(victoryAttended.values()).filter((e) => !e.absent).map((e) => e.date).sort()[0] ?? null;
    const participantVictoryDate = earliestVictoryDate ?? p.victoryDate ?? null;

    const victorySessionCols: Record<string, string> = {};
    for (const s of victorySessions) {
      const entry = victoryAttended.get(classKey(s.name));
      victorySessionCols[s.name] =
        entry && !entry.absent
          ? cell(entry)
          : participantVictoryDate
            ? formatDate(participantVictoryDate)
            : entry
              ? cell(entry)
              : "";
    }

    const victoryDateDisplay = participantVictoryDate ? formatDate(participantVictoryDate) : "";

    return {
      "#": i + 1,
      "Last Name": p.lastName,
      "First Name": p.firstName,
      "M.I.": p.middleInitial ?? "",
      "Preferred Name on ID": p.isWalkIn ? "" : (p.preferredNameOnId ?? ""),
      "Mobile": p.mobileNumber ?? "",
      "Facebook / Messenger": p.facebookMessengerName ?? "",
      "Lifestage": p.lifestage ?? "",
      "Age": p.age,
      "Gender": p.gender,
      "Service": p.serviceAttending,
      "Completed One2One": p.isWalkIn || p.registrationFee === "C" || p.registrationFee === "D"
        ? ""
        : p.completedOne2One
        ? "Yes"
        : "No (will complete before Victory Day)",
      "Will Undergo Water Baptism": p.willUndergoWaterBaptism ? "Yes" : "No",
      "Previous Church": p.isWalkIn ? "" : (p.previousChurch ?? ""),
      "Registration Fee": p.isWalkIn ? "" : (p.registrationFee ?? ""),
      "Receipt No.": p.isWalkIn ? "" : (p.acknowledgementReceiptNumber ?? ""),
      "Discipler Last Name": p.isWalkIn ? "" : (p.disciplerLastName ?? ""),
      "Discipler First Name": p.isWalkIn ? "" : (p.disciplerFirstName ?? ""),
      "Discipler Mobile": p.isWalkIn ? "" : (p.disciplerMobileNumber ?? ""),
      "Discipler Messenger": p.isWalkIn ? "" : (p.disciplerMessengerName ?? ""),
      "Admin Volunteer": p.isWalkIn ? "" : (p.adminVolunteerName ?? ""),
      "VG Leader Last Name": p.vgLeaderLastName ?? "",
      "VG Leader First Name": p.vgLeaderFirstName ?? "",
      "Victory Weekend / Victory Day Date": victoryDateDisplay,
      ...victorySessionCols,
      ...sessionCols,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");

  const allKeys = Object.keys(data[0] ?? {});
  ws["!cols"] = allKeys.map((key) => ({
    wch:
      Math.max(
        key.length,
        ...data.map((r) => String((r as Record<string, unknown>)[key] ?? "").length)
      ) + 2,
  }));

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `participants_${todayPH()}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

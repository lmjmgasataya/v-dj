import { db } from "@/db";
import { participants, checkIns, classSessions } from "@/db/schema";
import { isNull, desc, eq, inArray, and } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = await db
    .select()
    .from(participants)
    .where(isNull(participants.deletedAt))
    .orderBy(desc(participants.id));

  const sessions = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.isVictoryDay, false))
    .orderBy(classSessions.sessionDate);

  const victorySessions = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.isVictoryDay, true))
    .orderBy(classSessions.sessionDate);

  const participantIds = rows.map((r) => r.id);
  const attendance =
    participantIds.length > 0
      ? await db
          .select({
            participantId: checkIns.participantId,
            sessionId: checkIns.classSessionId,
            sessionDate: classSessions.sessionDate,
            remarks: checkIns.remarks,
          })
          .from(checkIns)
          .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
          .where(
            and(
              inArray(checkIns.participantId, participantIds),
              eq(classSessions.isVictoryDay, false)
            )
          )
      : [];

  const victoryAttendance =
    participantIds.length > 0
      ? await db
          .select({
            participantId: checkIns.participantId,
            sessionId: checkIns.classSessionId,
            sessionDate: classSessions.sessionDate,
            remarks: checkIns.remarks,
          })
          .from(checkIns)
          .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
          .where(
            and(
              inArray(checkIns.participantId, participantIds),
              eq(classSessions.isVictoryDay, true)
            )
          )
      : [];

  const attendanceMap = new Map<number, Map<number, { date: string; remarks: string | null }>>();
  for (const a of attendance) {
    if (!attendanceMap.has(a.participantId)) attendanceMap.set(a.participantId, new Map());
    attendanceMap.get(a.participantId)!.set(a.sessionId, { date: a.sessionDate, remarks: a.remarks });
  }

  const victoryAttendanceMap = new Map<number, Map<number, { date: string; remarks: string | null }>>();
  for (const a of victoryAttendance) {
    if (!victoryAttendanceMap.has(a.participantId)) victoryAttendanceMap.set(a.participantId, new Map());
    victoryAttendanceMap.get(a.participantId)!.set(a.sessionId, { date: a.sessionDate, remarks: a.remarks });
  }

  const formatDate = (date: string) =>
    new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const data = rows.map((p, i) => {
    const attended = attendanceMap.get(p.id) ?? new Map<number, { date: string; remarks: string | null }>();
    const sessionCols: Record<string, string> = {};
    for (const s of sessions) {
      const entry = attended.get(s.id);
      sessionCols[s.name] = entry ? formatDate(entry.date) + (entry.remarks ? ` (${entry.remarks})` : "") : "";
    }

    const victoryAttended = victoryAttendanceMap.get(p.id) ?? new Map<number, { date: string; remarks: string | null }>();
    const earliestVictoryDate = Array.from(victoryAttended.values()).map(e => e.date).sort()[0] ?? null;
    const participantVictoryDate = earliestVictoryDate ?? p.victoryDate ?? null;

    const victorySessionCols: Record<string, string> = {};
    for (const s of victorySessions) {
      const entry = victoryAttended.get(s.id);
      victorySessionCols[s.name] = entry
        ? formatDate(entry.date) + (entry.remarks ? ` (${entry.remarks})` : "")
        : participantVictoryDate ? formatDate(participantVictoryDate) : "";
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
      "Completed One2One": p.isWalkIn
        ? ""
        : p.completedOne2One
        ? "Yes"
        : "No (will complete before Victory Day)",
      "Water Baptism": p.isWalkIn
        ? ""
        : p.willUndergoWaterBaptism
        ? "Yes"
        : "No",
      "Previous Church": p.isWalkIn ? "" : (p.previousChurch ?? ""),
      "Registration Fee": p.isWalkIn ? "" : (p.registrationFee ?? ""),
      "Receipt No.": p.isWalkIn ? "" : (p.acknowledgementReceiptNumber ?? ""),
      "Discipler Last Name": p.isWalkIn ? "" : (p.disciplerLastName ?? ""),
      "Discipler First Name": p.isWalkIn ? "" : (p.disciplerFirstName ?? ""),
      "Discipler Mobile": p.isWalkIn ? "" : (p.disciplerMobileNumber ?? ""),
      "Discipler Messenger": p.isWalkIn ? "" : (p.disciplerMessengerName ?? ""),
      "Admin Volunteer": p.isWalkIn ? "" : (p.adminVolunteerName ?? ""),
      "VG Leader Last Name": p.isWalkIn ? (p.vgLeaderLastName ?? "") : "",
      "VG Leader First Name": p.isWalkIn ? (p.vgLeaderFirstName ?? "") : "",
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
  const filename = `participants_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

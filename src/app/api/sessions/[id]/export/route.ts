import { db } from "@/db";
import { classSessions, checkIns, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import * as XLSX from "xlsx";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  const [session] = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);

  if (!session) return notFound();

  const attendees = await db
    .select({
      checkedInAt: checkIns.checkedInAt,
      lastName: participants.lastName,
      firstName: participants.firstName,
      middleInitial: participants.middleInitial,
      preferredNameOnId: participants.preferredNameOnId,
      mobileNumber: participants.mobileNumber,
      facebookMessengerName: participants.facebookMessengerName,
      lifestage: participants.lifestage,
      age: participants.age,
      gender: participants.gender,
      serviceAttending: participants.serviceAttending,
      completedOne2One: participants.completedOne2One,
      willUndergoWaterBaptism: participants.willUndergoWaterBaptism,
      previousChurch: participants.previousChurch,
      registrationFee: participants.registrationFee,
      acknowledgementReceiptNumber: participants.acknowledgementReceiptNumber,
      disciplerLastName: participants.disciplerLastName,
      disciplerFirstName: participants.disciplerFirstName,
      disciplerMobileNumber: participants.disciplerMobileNumber,
    })
    .from(checkIns)
    .innerJoin(participants, eq(checkIns.participantId, participants.id))
    .where(eq(checkIns.classSessionId, sessionId))
    .orderBy(checkIns.checkedInAt);

  const rows = attendees.map((a, i) => ({
    "#": i + 1,
    "Last Name": a.lastName,
    "First Name": a.firstName,
    "M.I.": a.middleInitial ?? "",
    "Preferred Name on ID": a.preferredNameOnId,
    "Mobile": a.mobileNumber,
    "Facebook / Messenger": a.facebookMessengerName ?? "",
    "Lifestage": a.lifestage,
    "Age": a.age,
    "Gender": a.gender,
    "Service": a.serviceAttending,
    "Completed One2One": a.completedOne2One ? "Yes" : "No (will complete before Victory Day)",
    "Water Baptism": a.willUndergoWaterBaptism ? "Yes" : "No",
    "Previous Church": a.previousChurch,
    "Registration Fee": a.registrationFee,
    "Receipt No.": a.acknowledgementReceiptNumber,
    "Discipler Last Name": a.disciplerLastName,
    "Discipler First Name": a.disciplerFirstName,
    "Discipler Mobile": a.disciplerMobileNumber,
    "Check-in Time": new Date(a.checkedInAt).toLocaleTimeString("en-PH", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendees");

  // Auto-fit column widths
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `${session.name.replace(/[^a-z0-9]/gi, "_")}_${session.sessionDate}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

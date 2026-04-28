import { db } from "@/db";
import { participants } from "@/db/schema";
import { isNull, desc } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = await db
    .select()
    .from(participants)
    .where(isNull(participants.deletedAt))
    .orderBy(desc(participants.id));

  const data = rows.map((p, i) => ({
    "#": i + 1,
    "Last Name": p.lastName,
    "First Name": p.firstName,
    "M.I.": p.middleInitial ?? "",
    "Preferred Name on ID": p.preferredNameOnId,
    "Mobile": p.mobileNumber,
    "Facebook / Messenger": p.facebookMessengerName ?? "",
    "Lifestage": p.lifestage,
    "Age": p.age,
    "Gender": p.gender,
    "Service": p.serviceAttending,
    "Completed One2One": p.completedOne2One ? "Yes" : "No (will complete before Victory Day)",
    "Water Baptism": p.willUndergoWaterBaptism ? "Yes" : "No",
    "Previous Church": p.previousChurch,
    "Registration Fee": p.registrationFee,
    "Receipt No.": p.acknowledgementReceiptNumber,
    "Discipler Last Name": p.disciplerLastName,
    "Discipler First Name": p.disciplerFirstName,
    "Discipler Mobile": p.disciplerMobileNumber,
    "Discipler Messenger": p.disciplerMessengerName ?? "",
    "Admin Volunteer": p.adminVolunteerName,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");

  const colWidths = Object.keys(data[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String(r[key as keyof typeof r] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `participants_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

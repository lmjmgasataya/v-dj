"use server";

import { db } from "@/db";
import {
  participants, disciplers, victoryGroupLeaders, victoryGroups,
  classSessions, checkIns, smsLogs,
} from "@/db/schema";
import { lt } from "drizzle-orm";
import { parseCSV } from "@/lib/csv";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toastRedirectBack } from "@/lib/toast";

type ImportResult = { success: boolean; message: string };

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function purgeSmsLogsOlderThan(formData: FormData) {
  await requireDeveloper();

  const days = Number(formData.get("days"));
  if (!Number.isFinite(days) || days < 0) {
    await toastRedirectBack("Enter a valid number of days.", "error");
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const deleted = await db.delete(smsLogs).where(lt(smsLogs.createdAt, cutoff)).returning({ id: smsLogs.id });

  revalidatePath("/devops-admin/data");
  await toastRedirectBack(`Deleted ${deleted.length} SMS log${deleted.length !== 1 ? "s" : ""} older than ${days} day${days !== 1 ? "s" : ""}.`);
}

export async function purgeAllSmsLogs(_formData: FormData) {
  await requireDeveloper();

  const deleted = await db.delete(smsLogs).returning({ id: smsLogs.id });

  revalidatePath("/devops-admin/data");
  await toastRedirectBack(`Deleted ${deleted.length} SMS log${deleted.length !== 1 ? "s" : ""}.`);
}

const str = (v: string, fallback = "") => v || fallback;
const nullable = (v: string): string | null => v || null;
const int = (v: string): number | null => { const n = parseInt(v, 10); return isNaN(n) ? null : n; };
const bool = (v: string): boolean | null => v === "" ? null : v === "true" || v === "1";
const boolDef = (v: string, def = false): boolean => v === "" ? def : v === "true" || v === "1";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function importTable(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  await requireDeveloper();

  const table = formData.get("table") as string;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, message: "No file provided." };

  const text = await file.text();
  const rows = parseCSV(text);
  if (!rows.length) return { success: false, message: "File is empty or has no data rows." };

  try {
    let inserted = 0;

    switch (table) {
      case "participants": {
        const vals = rows.map(r => ({
          lastName: str(r.lastName),
          firstName: str(r.firstName),
          middleInitial: nullable(r.middleInitial),
          mobileNumber: nullable(r.mobileNumber),
          facebookMessengerName: nullable(r.facebookMessengerName),
          lifestage: nullable(r.lifestage) as typeof participants.$inferInsert["lifestage"],
          age: int(r.age) ?? 0,
          gender: str(r.gender),
          serviceAttending: str(r.serviceAttending),
          completedOne2One: bool(r.completedOne2One),
          willUndergoWaterBaptism: bool(r.willUndergoWaterBaptism),
          previousChurch: nullable(r.previousChurch),
          preferredNameOnId: nullable(r.preferredNameOnId),
          disciplerId: int(r.disciplerId),
          vgLeaderId: int(r.vgLeaderId),
          confirmedReadiness: bool(r.confirmedReadiness),
          acknowledgementReceiptNumber: nullable(r.acknowledgementReceiptNumber),
          registrationFee: nullable(r.registrationFee),
          adminVolunteerName: nullable(r.adminVolunteerName),
          isWalkIn: boolDef(r.isWalkIn, false),
          victoryDate: nullable(r.victoryDate),
        }));
        for (const ch of chunk(vals, 100)) {
          await db.insert(participants).values(ch).onConflictDoNothing();
          inserted += ch.length;
        }
        break;
      }

      case "disciplers": {
        const vals = rows.map(r => ({
          lastName: str(r.lastName),
          firstName: str(r.firstName),
          mobileNumber: str(r.mobileNumber),
          messengerName: nullable(r.messengerName),
        }));
        for (const ch of chunk(vals, 100)) {
          await db.insert(disciplers).values(ch).onConflictDoNothing();
          inserted += ch.length;
        }
        break;
      }

      case "vg_leaders": {
        const vals = rows.map(r => ({
          lastName: str(r.lastName),
          firstName: str(r.firstName),
          middleInitial: nullable(r.middleInitial),
          mobileNumber: str(r.mobileNumber),
          age: int(r.age),
          gender: nullable(r.gender),
          lifestage: nullable(r.lifestage) as typeof victoryGroupLeaders.$inferInsert["lifestage"],
          serviceAttending: nullable(r.serviceAttending),
          facebookMessengerName: nullable(r.facebookMessengerName),
        }));
        for (const ch of chunk(vals, 100)) {
          await db.insert(victoryGroupLeaders).values(ch).onConflictDoNothing();
          inserted += ch.length;
        }
        break;
      }

      case "class_sessions": {
        const vals = rows.map(r => ({
          name: str(r.name),
          sessionDate: str(r.sessionDate),
          isVictoryDay: boolDef(r.isVictoryDay),
          allowsWalkIn: boolDef(r.allowsWalkIn),
        }));
        for (const ch of chunk(vals, 100)) {
          await db.insert(classSessions).values(ch).onConflictDoNothing();
          inserted += ch.length;
        }
        break;
      }

      case "vg_groups": {
        const vals = rows.map(r => ({
          vgLeaderId: int(r.vgLeaderId) ?? 0,
          place: str(r.place),
          day: str(r.day) as typeof victoryGroups.$inferInsert["day"],
          time: str(r.time),
          frequency: str(r.frequency) as typeof victoryGroups.$inferInsert["frequency"],
          otherFrequency: nullable(r.otherFrequency),
        }));
        for (const ch of chunk(vals, 100)) {
          await db.insert(victoryGroups).values(ch).onConflictDoNothing();
          inserted += ch.length;
        }
        break;
      }

      case "check_ins": {
        const vals = rows.map(r => ({
          participantId: int(r.participantId) ?? 0,
          classSessionId: int(r.classSessionId) ?? 0,
          remarks: nullable(r.remarks),
        }));
        for (const ch of chunk(vals, 100)) {
          await db.insert(checkIns).values(ch).onConflictDoNothing();
          inserted += ch.length;
        }
        break;
      }

      default:
        return { success: false, message: "Import not supported for this table." };
    }

    revalidatePath("/devops-admin");
    return { success: true, message: `Processed ${inserted} rows.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, message: `Import failed: ${msg}` };
  }
}

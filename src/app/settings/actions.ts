"use server";

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setAppSetting } from "@/lib/settings";
import { toastRedirectBack } from "@/lib/toast";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
  return session;
}

export async function updateTableSettings(formData: FormData) {
  await requireDeveloper();
  const tableCapacity = Number(formData.get("tableCapacity"));
  const totalTables = Number(formData.get("totalTables"));
  if (!Number.isInteger(tableCapacity) || tableCapacity < 1) return;
  if (!Number.isInteger(totalTables) || totalTables < 1) return;

  await setAppSetting("table_capacity", String(tableCapacity));
  await setAppSetting("total_tables", String(totalTables));
  revalidatePath("/settings");
  await toastRedirectBack("Settings updated.");
}

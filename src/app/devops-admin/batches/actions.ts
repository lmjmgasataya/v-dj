"use server";

import { db } from "@/db";
import { batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toastRedirect, toastRedirectBack } from "@/lib/toast";

async function requireDeveloper() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");
}

export async function createBatch(formData: FormData) {
  await requireDeveloper();
  const isDefault = formData.get("isDefault") === "on";
  if (isDefault) {
    await db.update(batches).set({ isDefault: false });
  }
  await db.insert(batches).values({
    name: formData.get("name") as string,
    classStartDate: formData.get("classStartDate") as string,
    classEndDate: formData.get("classEndDate") as string,
    registrationStartDate: (formData.get("registrationStartDate") as string) || null,
    isDefault,
  });
  revalidatePath("/devops-admin/batches");
  await toastRedirectBack("Batch created.");
}

export async function updateBatch(formData: FormData) {
  await requireDeveloper();
  const id = Number(formData.get("id"));
  await db.update(batches).set({
    name: formData.get("name") as string,
    classStartDate: formData.get("classStartDate") as string,
    classEndDate: formData.get("classEndDate") as string,
    registrationStartDate: (formData.get("registrationStartDate") as string) || null,
  }).where(eq(batches.id, id));
  revalidatePath("/devops-admin/batches");
  toastRedirect("/devops-admin/batches", "Batch updated.");
}

export async function deleteBatch(formData: FormData) {
  await requireDeveloper();
  await db.delete(batches).where(eq(batches.id, Number(formData.get("id"))));
  revalidatePath("/devops-admin/batches");
  await toastRedirectBack("Batch deleted.");
}

export async function setDefaultBatch(formData: FormData) {
  await requireDeveloper();
  const id = Number(formData.get("id"));
  await db.update(batches).set({ isDefault: false });
  await db.update(batches).set({ isDefault: true }).where(eq(batches.id, id));
  revalidatePath("/devops-admin/batches");
  await toastRedirectBack("Default batch updated.");
}

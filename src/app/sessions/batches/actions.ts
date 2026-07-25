"use server";

import { db } from "@/db";
import { batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toastRedirect, toastRedirectBack } from "@/lib/toast";

async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/");
}

export async function createBatch(formData: FormData) {
  await requireAuth();
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
  revalidatePath("/sessions/batches");
  await toastRedirectBack("Batch created.");
}

export async function updateBatch(formData: FormData) {
  await requireAuth();
  const id = Number(formData.get("id"));
  await db
    .update(batches)
    .set({
      name: formData.get("name") as string,
      classStartDate: formData.get("classStartDate") as string,
      classEndDate: formData.get("classEndDate") as string,
      registrationStartDate: (formData.get("registrationStartDate") as string) || null,
    })
    .where(eq(batches.id, id));
  revalidatePath("/sessions/batches");
  toastRedirect("/sessions/batches", "Batch updated.");
}

export async function deleteBatch(formData: FormData) {
  await requireAuth();
  await db.delete(batches).where(eq(batches.id, Number(formData.get("id"))));
  revalidatePath("/sessions/batches");
  await toastRedirectBack("Batch deleted.");
}

export async function setDefaultBatch(formData: FormData) {
  await requireAuth();
  const id = Number(formData.get("id"));
  await db.update(batches).set({ isDefault: false });
  await db.update(batches).set({ isDefault: true }).where(eq(batches.id, id));
  revalidatePath("/sessions/batches");
  await toastRedirectBack("Default batch updated.");
}

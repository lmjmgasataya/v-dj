"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signSession, setSessionCookie, clearSessionCookie, type Role } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function login(_: unknown, formData: FormData) {
  const username = (formData.get("username") as string).trim();
  const password = formData.get("password") as string;

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid username or password." };
  }

  const token = await signSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role as Role,
  });
  await setSessionCookie(token);
  redirect("/");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}

"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
// import { loginLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signSession, setSessionCookie, clearSessionCookie, type Role } from "@/lib/auth";
import { redirect } from "next/navigation";
// import { headers } from "next/headers";

export async function login(_: unknown, formData: FormData) {
  const username = (formData.get("username") as string).trim();
  const password = formData.get("password") as string;

  // const headersList = await headers();
  // const ipAddress = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip");
  // const userAgent = headersList.get("user-agent");

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  const passwordMatch = user && (await bcrypt.compare(password, user.passwordHash));

  // await db.insert(loginLogs).values({
  //   username,
  //   userId: passwordMatch ? user.id : null,
  //   success: !!passwordMatch,
  //   ipAddress,
  //   userAgent,
  // });

  if (!passwordMatch) {
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

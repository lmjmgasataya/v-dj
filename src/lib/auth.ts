import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "dj_session";

function secret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "fallback-dev-secret-change-in-production"
  );
}

export type Role = "admin_volunteer" | "developer";

export interface SessionPayload {
  userId: number;
  username: string;
  name: string;
  role: Role;
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "dj_session";

function secret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "fallback-dev-secret-change-in-production"
  );
}

const DEVELOPER_ONLY = [
  /^\/participants\/\d+\/edit/,
  /^\/api\/participants/,
  /^\/sessions\/new/,
  /^\/sessions\/\d+\/edit/,
  /^\/manage-vg-leaders/,
];

const PUBLIC_PATHS = [/^\/login/, /^\/vg-portal\/claim/];

const VG_LEADER_ALLOWED = [/^\/vg-portal/];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((re) => re.test(pathname))) return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role as string;

    if (role === "vg_leader") {
      if (!VG_LEADER_ALLOWED.some((re) => re.test(pathname))) {
        return NextResponse.redirect(new URL("/vg-portal", request.url));
      }
      return NextResponse.next();
    }

    if (DEVELOPER_ONLY.some((re) => re.test(pathname)) && role !== "developer") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

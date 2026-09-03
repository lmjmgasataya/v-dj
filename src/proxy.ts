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
  /^\/event-registration\/events\/new/,
  /^\/event-registration\/events\/\d+\/edit/,
  /^\/event-registration\/sms-reminder/,
];

const PUBLIC_PATHS = [/^\/login/, /^\/vg-portal\/claim/, /^\/vg-portal\/login/, /^\/vg-portal\/events/, /^\/api\/interns/];

const VG_LEADER_ALLOWED = [/^\/vg-portal/, /^\/api\/vg-leaders/];

const LEAD_PASTOR_ALLOWED = [
  /^\/$/,
  /^\/journey/,
  /^\/participants$/,
  /^\/api\/participants\/export/,
  /^\/sessions$/,
  /^\/sessions\/\d+$/,
  /^\/report(\/.*)?$/,
  /^\/api\/report/,
];

function loginRedirect(request: NextRequest, pathname: string) {
  if (pathname.startsWith("/vg-portal")) {
    const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
    return NextResponse.redirect(new URL(`/vg-portal/claim?callbackUrl=${callbackUrl}`, request.url));
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((re) => re.test(pathname))) return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    return loginRedirect(request, pathname);
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

    if (role === "lead_pastor") {
      if (!LEAD_PASTOR_ALLOWED.some((re) => re.test(pathname))) {
        return NextResponse.redirect(new URL("/journey", request.url));
      }
      return NextResponse.next();
    }

    if (DEVELOPER_ONLY.some((re) => re.test(pathname)) && role !== "developer") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch {
    return loginRedirect(request, pathname);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

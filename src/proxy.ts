import { NextRequest, NextResponse } from "next/server";

import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/auth";

const publicRoutes = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublicRoute = publicRoutes.has(pathname);
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const role = request.cookies.get(ROLE_COOKIE)?.value;

  if (isPublicRoute && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicRoute && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/organizer") && role !== "organizer") {
    return NextResponse.redirect(new URL("/me", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};

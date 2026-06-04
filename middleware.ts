import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, getSafeInternalPath, isPublicRoutePath } from "@/lib/auth";

function buildLoginUrl(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("next", nextPath);

  return loginUrl;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isLoginPage = pathname === "/login";

  if (!hasSession && !isPublicRoutePath(pathname)) {
    return NextResponse.redirect(buildLoginUrl(request));
  }

  if (hasSession && isLoginPage) {
    const destinationUrl = request.nextUrl.clone();
    destinationUrl.pathname = getSafeInternalPath(searchParams.get("next"));
    destinationUrl.search = "";

    return NextResponse.redirect(destinationUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};

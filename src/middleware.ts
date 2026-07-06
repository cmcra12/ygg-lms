import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "ygg_session";

// Edge middleware can't reach SQLite, so this is only a fast redirect for
// missing cookies. Real session validation happens in requireUser() on every
// server page and action.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/login") {
    return NextResponse.next();
  }
  if (!hasSession) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

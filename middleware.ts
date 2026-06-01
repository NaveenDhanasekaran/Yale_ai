import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_VALUE = process.env.SESSION_SECRET || "yale-admin-default-9f3a7c21e8b4";

// Paths that never require admin login.
function isPublic(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/t/") || // technician links
    pathname.startsWith("/c/") || // customer links
    pathname.startsWith("/api/") // webhooks, cron
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const authed = req.cookies.get("admin_auth")?.value === SESSION_VALUE;
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};

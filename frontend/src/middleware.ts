/**
 * middleware.ts — Protección de rutas por rol
 * Enfoque local: cookie simple de sesión (sin Firebase Auth).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/api"];
const ADMIN_ROUTES = ["/reports", "/sanctions", "/monitors"];
const MONITOR_ROUTES = ["/inventory/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/icons")) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("session");
  const rolCookie = request.cookies.get("userRol");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rol = rolCookie?.value;

  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    if (rol !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (MONITOR_ROUTES.some(r => pathname.startsWith(r))) {
    if (rol !== "monitor" && rol !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons).*)"],
};

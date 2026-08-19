/**
 * middleware.ts — Control de acceso por rol (RF-02)
 *
 * Sin autenticación → solo /login accesible.
 * Estudiante → dashboard, inventario, prestamos (ver/solicitar)
 * Monitor/Admin → dashboard, inventario (gestionar), prestamos (aprobar/devolver)
 * Admin → reportes, sanciones, monitores, configuración
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas: cualquiera puede ver
const PUBLIC = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/logout"];

// Rutas exclusivas de admin
const ADMIN_ONLY = ["/reportes", "/monitores", "/configuracion", "/estudiantes"];
const MONITOR_ONLY = ["/prestamos/docente"];

// Rutas de monitor (crear activos, aprobar, devolver)
const MONITOR_PATHS = ["/inventario/registrar", "/prestamos/aprobar", "/prestamos/devolver"];

// Rutas de estudiante (solicitar préstamo)
const ESTUDIANTE_PATHS = ["/prestamos/nuevo"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir assets y API routes (la API tiene su propia validación)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Permitir rutas públicas
  if (PUBLIC.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Verificar sesión
  const sessionId = request.cookies.get("session")?.value;
  const rol = request.cookies.get("userRol")?.value;

  if (!sessionId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si login tiene redirect, redirigir a dashboard si ya está autenticado
  if (pathname === "/login" && sessionId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Control por rol
  if (ADMIN_ONLY.some((r) => pathname.startsWith(r)) && rol !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (MONITOR_PATHS.some((r) => pathname.startsWith(r))) {
    const lowerPath = pathname.toLowerCase();
    if (lowerPath.startsWith("/prestamos/aprobar") || lowerPath.startsWith("/prestamos/devolver")) {
      if (rol !== "monitor" && rol !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    if (lowerPath.startsWith("/inventario/registrar")) {
      if (rol !== "monitor" && rol !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons).*)"],
};
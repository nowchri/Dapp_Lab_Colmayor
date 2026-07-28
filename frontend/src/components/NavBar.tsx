"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AVATAR_SVGS: Record<string, string> = {
  atom: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="12" fill="#FFFFFF"/><ellipse cx="40" cy="40" rx="32" ry="10" stroke="#F7C800" strokeWidth="2" transform="rotate(0 40 40)"/><ellipse cx="40" cy="40" rx="32" ry="10" stroke="#F7C800" strokeWidth="2" transform="rotate(60 40 40)"/><ellipse cx="40" cy="40" rx="32" ry="10" stroke="#F7C800" strokeWidth="2" transform="rotate(120 40 40)"/></svg>',
  flask: '<svg viewBox="0 0 80 80" fill="none"><path d="M30 10h20v20l12 35a5 5 0 01-4.5 7h-35a5 5 0 01-4.5-7l12-35V10z" stroke="#FFFFFF" strokeWidth="3" fill="none"/><circle cx="40" cy="30" r="3" fill="#F7C800"/></svg>',
  chip: '<svg viewBox="0 0 80 80" fill="none"><rect x="15" y="15" width="50" height="50" rx="4" stroke="#FFFFFF" strokeWidth="3" fill="none"/><rect x="27" y="27" width="26" height="26" rx="2" fill="#F7C800" opacity="0.4"/><path d="M40 10v10M40 60v10M10 40h10M60 40h10" stroke="#FFFFFF" strokeWidth="2"/></svg>',
  book: '<svg viewBox="0 0 80 80" fill="none"><rect x="10" y="15" width="25" height="50" rx="3" stroke="#FFFFFF" strokeWidth="3" fill="none"/><rect x="35" y="15" width="25" height="50" rx="3" stroke="#FFFFFF" strokeWidth="3" fill="none"/><line x1="22" y1="15" x2="22" y2="65" stroke="#F7C800" strokeWidth="2"/><line x1="47" y1="15" x2="47" y2="65" stroke="#F7C800" strokeWidth="2"/></svg>',
  rocket: '<svg viewBox="0 0 80 80" fill="none"><path d="M40 5L25 45h30L40 5z" fill="#FFFFFF"/><rect x="34" y="45" width="12" height="10" rx="2" fill="#F7C800"/><path d="M30 65a10 10 0 0020 0" stroke="#FFFFFF" strokeWidth="3"/><circle cx="40" cy="20" r="4" fill="#09488D"/></svg>',
  gear: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="18" stroke="#FFFFFF" strokeWidth="4" fill="none"/><circle cx="40" cy="40" r="8" fill="#F7C800"/><path d="M40 12v8M40 60v8M12 40h8M60 40h8M20 20l6 6M54 54l6 6M54 26l-6 6M26 54l-6 6" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round"/></svg>',
};

export default function NavBar() {
  const [rol, setRol] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarId, setAvatarId] = useState("atom");
  const pathname = usePathname();

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const r = cookies.find((row) => row.startsWith("userRol="));
    const n = cookies.find((row) => row.startsWith("userName="));
    setRol(r ? r.split("=")[1] : "");
    setUserName(n ? decodeURIComponent(n.split("=")[1]) : "");
    setAvatarId(localStorage.getItem("avatarId") || "atom");
  }, [pathname]);

  useEffect(() => {
    const handler = () => setAvatarId(localStorage.getItem("avatarId") || "atom");
    window.addEventListener("avatarChanged", handler);
    return () => window.removeEventListener("avatarChanged", handler);
  }, []);

  const handleLogout = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch (_) {
      document.cookie = "session=; path=/; max-age=0";
      document.cookie = "userRol=; path=/; max-age=0";
      document.cookie = "userId=; path=/; max-age=0";
      document.cookie = "userName=; path=/; max-age=0";
    }
    window.location.href = "/login";
  }, []);

  if (!rol) return null;

  const avatarSvg = AVATAR_SVGS[avatarId] || AVATAR_SVGS.atom;

  const linkClass = (href: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
        ? "bg-white/15 text-white"
        : "text-white/75 hover:text-white hover:bg-white/8"
    }`;

  return (
    <nav className="bg-[#09488D] text-white px-5 py-3.5 flex items-center justify-between shadow-lg sticky top-0 z-50 w-full min-h-[56px]">
      {/* Left: Brand */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="font-bold text-lg shrink-0 tracking-tight">
          🔬 Lab IUCMC
        </Link>
        <div className="hidden md:flex gap-0.5 text-sm ml-3">
          <Link href="/dashboard" className={linkClass("/dashboard")}>Inicio</Link>
          <Link href="/inventario" className={linkClass("/inventario")}>Inventario</Link>
          {rol === "estudiante" && (
            <>
              <Link href="/prestamos/nuevo" className={linkClass("/prestamos/nuevo")}>Nuevo Préstamo</Link>
              <Link href="/prestamos" className={linkClass("/prestamos")}>Mis Préstamos</Link>
            </>
          )}
          {(rol === "monitor" || rol === "admin") && (
            <>
              <Link href="/inventario/registrar" className={linkClass("/inventario/registrar")}>Nuevo Activo</Link>
              <Link href="/prestamos/aprobar" className={linkClass("/prestamos/aprobar")}>Aprobar</Link>
              <Link href="/prestamos/devolver" className={linkClass("/prestamos/devolver")}>Devoluciones</Link>
              <Link href="/prestamos" className={linkClass("/prestamos")}>Préstamos</Link>
            </>
          )}
          {rol === "admin" && (
            <>
              <Link href="/reportes" className={linkClass("/reportes")}>Reportes</Link>
              <Link href="/monitores" className={linkClass("/monitores")}>Monitores</Link>
              <Link href="/estudiantes" className={linkClass("/estudiantes")}>Estudiantes</Link>
              <Link href="/configuracion" className={linkClass("/configuracion")}>Config</Link>
            </>
          )}
        </div>
      </div>

      {/* Right: Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link href="/perfil" className="flex items-center gap-2 hover:bg-white/10 px-2 py-1 rounded-lg transition" title="Ver perfil">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20"
            dangerouslySetInnerHTML={{ __html: avatarSvg }} />
          <span className="text-sm text-white/85 hidden sm:inline font-medium">{userName || "Usuario"}</span>
        </Link>
        <span className="text-[11px] bg-white/15 px-2.5 py-1 rounded-full capitalize hidden sm:inline font-medium">{rol}</span>
        <button onClick={handleLogout} className="text-white/55 text-sm hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition border-0 cursor-pointer">
          Salir
        </button>
      </div>
    </nav>
  );
}
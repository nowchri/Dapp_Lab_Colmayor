"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rol, setRol] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarId, setAvatarId] = useState("atom");
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Close profile dropdown on outside click
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  // Close mobile on path change
  useEffect(() => { setMobileOpen(false); setProfileOpen(false); }, [pathname]);

  const handleLogout = useCallback(async () => {
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

  // Build all links for mobile dropdown
  const allLinks: { href: string; label: string }[] = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/inventario", label: "Inventario" },
  ];
  if (rol === "estudiante") {
    allLinks.push({ href: "/prestamos/nuevo", label: "Nuevo Préstamo" });
    allLinks.push({ href: "/prestamos", label: "Mis Préstamos" });
  }
  if (rol === "monitor" || rol === "admin") {
    allLinks.push({ href: "/inventario/registrar", label: "Nuevo Activo" });
    allLinks.push({ href: "/prestamos/docente", label: "Préstamo a Docente" });
    allLinks.push({ href: "/prestamos/aprobar", label: "Aprobar" });
    allLinks.push({ href: "/prestamos/devolver", label: "Devoluciones" });
    allLinks.push({ href: "/prestamos", label: "Préstamos" });
  }
  if (rol === "admin") {
    allLinks.push({ href: "/reportes", label: "Reportes" });
    allLinks.push({ href: "/monitores", label: "Monitores" });
    allLinks.push({ href: "/estudiantes", label: "Estudiantes" });
    allLinks.push({ href: "/configuracion", label: "Config" });
  }

  return (
    <nav className="bg-[#09488D] text-white px-4 md:px-5 py-3 flex items-center justify-between shadow-lg sticky top-0 z-50 w-full min-h-[56px]">
      {/* Left: Brand */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="font-bold text-base md:text-lg shrink-0 tracking-tight">
          🔬 Lab IUCMC
        </Link>
        {/* Desktop links */}
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
              <Link href="/prestamos/docente" className={linkClass("/prestamos/docente")}>Docente</Link>
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

      {/* Right: Profile + Hamburger */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-1.5 hover:bg-white/10 px-1.5 py-1 rounded-lg transition"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20"
              dangerouslySetInnerHTML={{ __html: avatarSvg }} />
            <span className="text-sm text-white/85 hidden sm:inline font-medium max-w-[120px] truncate">{userName || "Usuario"}</span>
            <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full capitalize hidden sm:inline font-medium">{rol}</span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-gray-100">
                <p className="text-xs font-medium text-slate-700 truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 capitalize">{rol}</p>
              </div>
              <Link href="/perfil" onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-[#F4F6F9] transition">
                👤 Ver Perfil
              </Link>
              <button onClick={() => { setProfileOpen(false); handleLogout(); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition w-full text-left">
                🚪 Salir
              </button>
            </div>
          )}
        </div>

        {/* Hamburger — mobile only, replaces old Salir button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white p-1.5 rounded-lg hover:bg-white/10 text-lg leading-none"
          aria-label="Menú"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#09488D] border-t border-white/10 shadow-lg z-50 py-2 px-4 space-y-0.5">
          {allLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${
                pathname === l.href ? "bg-white/15 font-medium" : "hover:bg-white/8"
              } text-white transition`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
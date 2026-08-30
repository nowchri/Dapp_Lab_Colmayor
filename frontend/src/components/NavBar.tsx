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

interface NavItem { href: string; label: string }
interface NavGrupo { titulo: string; items: NavItem[] }

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rol, setRol] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarId, setAvatarId] = useState("atom");
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [mobileOpenGroups, setMobileOpenGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

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
      if (navRef.current && !navRef.current.contains(e.target as Node)) setDropdownOpen(null);
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  // Close mobile + dropdowns on path change
  useEffect(() => { setMobileOpen(false); setProfileOpen(false); setDropdownOpen(null); setMobileOpenGroups({}); }, [pathname]);

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
  if (pathname === "/primer-ingreso") return null;

  const avatarSvg = AVATAR_SVGS[avatarId] || AVATAR_SVGS.atom;

  // ── Estructura de navegación por rol ──
  const estudianteLinks: NavItem[] = [
    { href: "/inventario", label: "Inventario" },
    { href: "/prestamos/nuevo", label: "Nuevo Préstamo" },
    { href: "/prestamos", label: "Mis Préstamos" },
  ];

  const grupos: NavGrupo[] = [];
  const tailLinks: NavItem[] = [];

  if (rol === "monitor" || rol === "admin") {
    grupos.push({
      titulo: "Activos",
      items: [
        { href: "/inventario", label: "Inventario" },
        { href: "/inventario/registrar", label: "Registrar Nuevo Activo" },
        ...(rol === "admin" ? [{ href: "/trazabilidad", label: "Trazabilidad" }] : []),
      ],
    });
    grupos.push({
      titulo: "Operaciones",
      items: [
        { href: "/prestamos", label: "Préstamos" },
        { href: "/prestamos/devolver", label: "Devoluciones" },
        { href: "/prestamos/aprobar", label: "Aprobaciones" },
        { href: "/prestamos/docente", label: "Préstamo a Docente" },
      ],
    });
  }
  if (rol === "admin") {
    grupos.push({
      titulo: "Usuarios",
      items: [
        { href: "/estudiantes", label: "Estudiantes" },
        { href: "/monitores", label: "Monitores" },
      ],
    });
    tailLinks.push({ href: "/reportes", label: "Reportes" });
    tailLinks.push({ href: "/configuracion", label: "Configuración" });
  }

  const linkClass = (href: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      pathname === href || (href !== "/dashboard" && (pathname || "").startsWith(href))
        ? "bg-white/15 text-white"
        : "text-white/75 hover:text-white hover:bg-white/8"
    }`;

  const grupoActivo = (g: NavGrupo) =>
    g.items.some(it => pathname === it.href || (pathname || "").startsWith(it.href));

  const dropdownBtnClass = (g: NavGrupo) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
      grupoActivo(g) ? "bg-white/15 text-white" : "text-white/75 hover:text-white hover:bg-white/8"
    }`;

  return (
    <nav className="bg-[#09488D] text-white px-4 md:px-5 py-3 flex items-center justify-between shadow-lg sticky top-0 z-50 w-full min-h-[56px]">
      {/* Left: Brand + links */}
      <div className="flex items-center gap-2 min-w-0">
        <Link href="/dashboard" className="font-bold text-base md:text-lg shrink-0 tracking-tight">
          🔬 Lab IUCMC
        </Link>

        {/* Desktop links */}
        <div ref={navRef} className="hidden md:flex gap-0.5 text-sm ml-3 items-center">
          <Link href="/dashboard" className={linkClass("/dashboard")}>Inicio</Link>
          {rol === "estudiante" && estudianteLinks.map(l => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>{l.label}</Link>
          ))}
          {grupos.map(g => (
            <div key={g.titulo} className="relative">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === g.titulo ? null : g.titulo)}
                className={dropdownBtnClass(g)}
              >
                {g.titulo}
                <span className={`text-[9px] transition-transform ${dropdownOpen === g.titulo ? "rotate-180" : ""}`}>▼</span>
              </button>
              {dropdownOpen === g.titulo && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                  {g.items.map(it => (
                    <Link key={it.href} href={it.href} onClick={() => setDropdownOpen(null)}
                      className={`flex items-center gap-2 px-3.5 py-2 text-sm transition ${
                        pathname === it.href || (pathname || "").startsWith(it.href)
                          ? "text-[#09488D] font-medium bg-[#09488D]/5"
                          : "text-slate-700 hover:bg-[#F4F6F9]"
                      }`}>
                      {it.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {tailLinks.map(l => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>{l.label}</Link>
          ))}
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

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white p-1.5 rounded-lg hover:bg-white/10 text-lg leading-none"
          aria-label="Menú"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown — agrupado */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#09488D] border-t border-white/10 shadow-lg z-50 py-3 px-4 max-h-[80vh] overflow-y-auto">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}
            className={`block px-3 py-2 rounded-lg text-sm ${pathname === "/dashboard" ? "bg-white/15 font-medium" : "hover:bg-white/8"} text-white transition`}>
            Inicio
          </Link>
          {rol === "estudiante" && estudianteLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${pathname === l.href ? "bg-white/15 font-medium" : "hover:bg-white/8"} text-white transition`}>
              {l.label}
            </Link>
          ))}
          {grupos.map(g => {
            const abierto = !!mobileOpenGroups[g.titulo];
            const activo = g.items.some(it => pathname === it.href || (pathname || "").startsWith(it.href));
            return (
              <div key={g.titulo} className="mt-1">
                <button
                  onClick={() => setMobileOpenGroups(prev => ({ ...prev, [g.titulo]: !prev[g.titulo] }))}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${activo ? "bg-white/15 font-medium" : "hover:bg-white/8"} text-white`}
                >
                  <span>{g.titulo}</span>
                  <span className={`text-[9px] text-white/60 transition-transform ${abierto ? "rotate-180" : ""}`}>▼</span>
                </button>
                {abierto && (
                  <div className="ml-3 border-l border-white/15 pl-2 mt-0.5 space-y-0.5">
                    {g.items.map(it => (
                      <Link key={it.href} href={it.href} onClick={() => setMobileOpen(false)}
                        className={`block px-3 py-2 rounded-lg text-sm ${pathname === it.href || (pathname || "").startsWith(it.href) ? "bg-white/15 font-medium" : "hover:bg-white/8"} text-white transition`}>
                        {it.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {tailLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm mt-2 ${pathname === l.href ? "bg-white/15 font-medium" : "hover:bg-white/8"} text-white transition`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User { nombre_completo: string; rol: "estudiante" | "monitor" | "admin"; }

function SystemStatus() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.authenticated && d.user.rol === "admin") fetch("/api/reports/stats").then(r => r.json()).then(setStats).catch(() => {});
    });
  }, []);
  if (!stats) return null;
  return (
    <div className="card-glass">
      <h3 className="font-bold text-[#09488D] mb-4">Resumen del Sistema</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div><p className="text-2xl font-bold text-[#09488D]">{stats.total_activos || 0}</p><p className="text-xs text-gray-500 mt-1">Activos</p></div>
        <div><p className="text-2xl font-bold text-emerald-600">{stats.disponibles || stats.activos_disponibles || 0}</p><p className="text-xs text-gray-500 mt-1">Disponibles</p></div>
        <div><p className="text-2xl font-bold text-[#09488D]">{stats.prestamos_activos || 0}</p><p className="text-xs text-gray-500 mt-1">Préstamos</p></div>
        <div><p className="text-2xl font-bold text-rose-600">{stats.en_mora || 0}</p><p className="text-xs text-gray-500 mt-1">En Mora</p></div>
      </div>
    </div>
  );
}

function ShortcutCard({ icon, title, desc, href, accent }: { icon: string; title: string; desc: string; href: string; accent?: boolean }) {
  const router = useRouter();
  return (
    <div onClick={() => router.push(href)} className={`card-glass cursor-pointer group hover:-translate-y-1 ${accent ? "border-[#F7C800]/30" : ""}`}>
      <div className={`text-4xl mb-4 ${accent ? "drop-shadow-[0_0_8px_rgba(247,200,0,0.25)]" : ""}`}>{icon}</div>
      <h3 className="font-bold text-[#09488D] text-lg group-hover:text-[#06244A] transition-colors">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (!d.authenticated) router.push("/login"); else setUser(d.user); })
      .catch(() => router.push("/login")).finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <div className="w-8 h-8 border-2 border-[#09488D] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Hero banner — full width, flush with navbar */}
      <div className="gradient-hero text-white py-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 opacity-[0.04]">
          <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="none" stroke="white" strokeWidth="1"/><circle cx="100" cy="100" r="45" fill="none" stroke="white" strokeWidth="1"/><line x1="55" y1="55" x2="145" y2="145" stroke="white" strokeWidth="0.5"/><line x1="145" y1="55" x2="55" y2="145" stroke="white" strokeWidth="0.5"/></svg>
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <h2 className="text-3xl font-bold">Bienvenido, {user.nombre_completo.split(" ")[0]} 👋</h2>
          <p className="text-white/70 mt-3 text-balance max-w-xl text-lg">
            {user.rol === "estudiante" && "Explorá el catálogo de equipos, armá tu bolsa de materiales y gestioná tus préstamos del laboratorio."}
            {user.rol === "monitor" && "Aprobá préstamos, registrá devoluciones y mantené actualizado el inventario del laboratorio."}
            {user.rol === "admin" && "Administrá monitores, generá reportes y configurá las reglas del sistema."}
          </p>
          <span className="inline-block mt-5 px-4 py-1.5 bg-white/15 rounded-full text-sm font-medium capitalize">{user.rol}</span>
        </div>
      </div>

      {/* Cards grid — constrained width */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {user.rol === "estudiante" && (
            <>
              <ShortcutCard icon="📦" title="Inventario" desc="Catálogo disponible" href="/inventario" />
              <ShortcutCard icon="🛒" title="Nuevo Préstamo" desc="Armá tu bolsa" href="/prestamos/nuevo" accent />
              <ShortcutCard icon="📋" title="Mis Préstamos" desc="Consultá tus activos" href="/prestamos" />
            </>
          )}
          {(user.rol === "monitor" || user.rol === "admin") && (
            <>
              <ShortcutCard icon="📦" title="Inventario" desc="Gestioná activos" href="/inventario" />
              <ShortcutCard icon="✅" title="Aprobar" desc="Validá pendientes" href="/prestamos/aprobar" accent />
              <ShortcutCard icon="🔄" title="Devoluciones" desc="Registrá material" href="/prestamos/devolver" />
              <ShortcutCard icon="➕" title="Nuevo Activo" desc="Registrá equipo" href="/inventario/registrar" />
            </>
          )}
          {user.rol === "admin" && (
            <>
              <ShortcutCard icon="👥" title="Monitores" desc="Gobernanza" href="/monitores" />
              <ShortcutCard icon="📊" title="Reportes" desc="Exportar CSV" href="/reportes" />
              <ShortcutCard icon="⚙️" title="Configuración" desc="Bloqueo por mora" href="/configuracion" />
            </>
          )}
        </div>

        <SystemStatus />
      </main>
    </div>
  );
}
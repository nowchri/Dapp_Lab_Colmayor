"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FabScanner from "@/components/FabScanner";



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

        <FabScanner />

    </div>
  );
}


const Icons = {
  inventario: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="6" width="18" height="18" rx="4" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.08" />
      <rect x="26" y="6" width="18" height="18" rx="4" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.08" />
      <rect x="4" y="28" width="40" height="14" rx="4" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.04" />
      <circle cx="13" cy="15" r="2" fill="#F7C800" />
      <circle cx="35" cy="15" r="2" fill="#F7C800" />
      <circle cx="13" cy="35" r="2" fill="#F7C800" />
      <circle cx="24" cy="35" r="2" fill="#10b981" />
      <circle cx="35" cy="35" r="2" fill="#10b981" />
    </svg>
  ),
  prestamo: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="6" y="8" width="36" height="32" rx="5" stroke="#09488D" strokeWidth="2.5" fill="#F7C800" fillOpacity="0.12" />
      <circle cx="18" cy="24" r="5" stroke="#09488D" strokeWidth="2" />
      <line x1="21.5" y1="27.5" x2="26" y2="32" stroke="#09488D" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="18" x2="24" y2="18" stroke="#F7C800" strokeWidth="3" strokeLinecap="round" />
      <line x1="12" y1="14" x2="20" y2="14" stroke="#F7C800" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  prestamos: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="6" width="40" height="14" rx="5" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.08" />
      <rect x="4" y="24" width="40" height="18" rx="5" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.04" />
      <line x1="14" y1="12" x2="34" y2="12" stroke="#F7C800" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="7" x2="28" y2="7" stroke="#F7C800" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="32" r="2" fill="#10b981" />
      <line x1="18" y1="35" x2="30" y2="35" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  aprobar: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.06" />
      <path d="M15 25l5 5 13-13" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="16" r="5" fill="#F7C800" opacity="0.6" />
    </svg>
  ),
  devolver: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.06" />
      <path d="M28 16l-8 8 8 8" stroke="#F7C800" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 24h14" stroke="#F7C800" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  ),
  monitores: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="16" cy="14" r="5" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.08" />
      <circle cx="32" cy="14" r="5" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.08" />
      <path d="M8 32c0-3 4-6 8-6h16c4 0 8 3 8 6v4H8z" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.06" />
      <circle cx="24" cy="36" r="3" fill="#F7C800" />
    </svg>
  ),
  reportes: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="6" y="24" width="10" height="18" rx="2" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.1" />
      <rect x="19" y="16" width="10" height="26" rx="2" stroke="#09488D" strokeWidth="2.5" fill="#F7C800" fillOpacity="0.15" />
      <rect x="32" y="8" width="10" height="34" rx="2" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.06" />
      <line x1="10" y1="26" x2="14" y2="26" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="23" y1="18" x2="27" y2="18" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  config: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="8" stroke="#09488D" strokeWidth="2.5" fill="#09488D" fillOpacity="0.08" />
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6" stroke="#F7C800" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="8" r="2" fill="#F7C800" />
      <circle cx="24" cy="40" r="2" fill="#F7C800" />
      <circle cx="8" cy="24" r="2" fill="#F7C800" />
      <circle cx="40" cy="24" r="2" fill="#F7C800" />
    </svg>
  ),
};

function ShortcutCard({ icon, title, desc, href, accent }: { icon: React.ReactNode; title: string; desc: string; href: string; accent?: boolean }) {
  const router = useRouter();
  return (
    <div onClick={() => router.push(href)} className={`card-glass cursor-pointer group hover:-translate-y-1 ${accent ? "border-[#F7C800]/30" : ""}`}>
      <div className={`mb-4 ${accent ? "drop-shadow-[0_0_8px_rgba(247,200,0,0.25)]" : ""}`}>{icon}</div>
      <h3 className="font-bold text-[#09488D] text-lg group-hover:text-[#06244A] transition-colors">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </div>


  );
}

function BlockchainStatus() {
  const [balance, setBalance] = useState("—");
  const [professor, setProfessor] = useState("—");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { getBalance, getContractInfo, getRecentEvents } = await import("@/lib/blockchain");
        const addr = "0x5d0A0f056f222D3EDa3866d5977AC99B55C20baF";
        const [bal, info, evts] = await Promise.all([
          getBalance(addr),
          getContractInfo(),
          getRecentEvents(5),
        ]);
        setBalance(Number(bal).toFixed(4));
        setProfessor(String(info.professor).slice(0, 10) + "...");
        setEvents(evts);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="card-glass">
      <h3 className="font-bold text-[#09488D] mb-4">⛓️ Datos del Contrato</h3>
      <p className="text-sm text-slate-400">Conectando con Polygon Amoy...</p>
    </div>
  );

  return (
    <div className="card-glass space-y-4">
      <h3 className="font-bold text-[#09488D] text-lg">⛓️ Smart Contract — Polygon Amoy</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#09488D]/5 rounded-xl p-4">
          <p className="text-xs text-slate-500">Wallet del servidor</p>
          <p className="font-mono text-xs text-[#09488D] font-bold mt-1">0x5d0A...baF</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs text-slate-500">Balance MATIC</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{balance} MATIC</p>
        </div>
      </div>
      <div className="bg-[#F4F6F9] rounded-xl p-4">
        <p className="text-xs text-slate-500 mb-1">Owner del contrato (Professor)</p>
        <p className="font-mono text-xs text-slate-700">{professor}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-2 font-medium">Ultimos eventos en blockchain:</p>
        {events.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No hay eventos recientes.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {events.map((ev: any, i: number) => (
              <div key={i} className={`text-xs p-2 rounded-lg ${ev.event === "Prestamo" ? "bg-[#09488D]/5 border-l-2 border-[#09488D]" : "bg-emerald-50 border-l-2 border-emerald-500"}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-semibold ${ev.event === "Prestamo" ? "text-[#09488D]" : "text-emerald-600"}`}>
                    {ev.event === "Prestamo" ? "📦 Prestamo" : "✅ Devolucion"}
                  </span>
                  <span className="text-slate-400">{ev.timestamp}</span>
                </div>
                <p className="font-mono text-[10px] text-slate-500">Asset: {ev.assetHash}</p>
              </div>
            ))}
          </div>
        )}
      </div>
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
        <img
          src="/img/Unimayor-Cauca.webp"
          alt="Unimayor"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.25]"
        />
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
              <ShortcutCard icon={Icons.inventario} title="Inventario" desc="Catálogo disponible" href="/inventario" />
              <ShortcutCard icon={Icons.prestamo} title="Nuevo Préstamo" desc="Armá tu bolsa" href="/prestamos/nuevo" accent />
              <ShortcutCard icon={Icons.prestamos} title="Mis Préstamos" desc="Consultá tus activos" href="/prestamos" />
            </>
          )}
          {(user.rol === "monitor" || user.rol === "admin") && (
            <>
              <ShortcutCard icon={Icons.inventario} title="Inventario" desc="Gestioná activos" href="/inventario" />
              <ShortcutCard icon={Icons.aprobar} title="Aprobar" desc="Validá pendientes" href="/prestamos/aprobar" accent />
              <ShortcutCard icon={Icons.devolver} title="Devoluciones" desc="Registrá material" href="/prestamos/devolver" />
              <ShortcutCard icon={Icons.inventario} title="Nuevo Activo" desc="Registrá equipo" href="/inventario/registrar" />
            </>
          )}
          {user.rol === "admin" && (
            <>
              <ShortcutCard icon={Icons.monitores} title="Monitores" desc="Gobernanza" href="/monitores" />
              <ShortcutCard icon={Icons.reportes} title="Reportes" desc="Exportar CSV" href="/reportes" />
              <ShortcutCard icon={Icons.config} title="Configuración" desc="Bloqueo por mora" href="/configuracion" />
            </>
          )}
        </div>

        {user.rol === "admin" && <BlockchainStatus />}
      </main>
    </div>

  );

}
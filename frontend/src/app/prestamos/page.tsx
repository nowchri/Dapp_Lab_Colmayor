"use client";

import { useEffect, useState } from "react";

interface Prestamo {
  id_prestamo: string; estudiante_nombre: string; monitor_nombre: string | null;
  estado_general: "pendiente" | "activo" | "devuelto" | "mora";
  fecha_inicio: string; fecha_limite: string; materia: string | null; profesor_encargado: string | null;
}

const STATUS: Record<string, { label: string; icon: string; pill: string }> = {
  pendiente: { label: "Pendiente", icon: "⏳", pill: "pill-accent" },
  activo:    { label: "Activo",    icon: "📦", pill: "pill-primary" },
  devuelto:  { label: "Devuelto",  icon: "✅", pill: "pill-success" },
  mora:      { label: "En Mora",   icon: "🚨", pill: "pill-danger" },
};

export default function PrestamosPage() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/prestamos").then(r => r.json()).then(setPrestamos).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <div className="w-8 h-8 border-2 border-[#09488D] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#09488D]">Mis Préstamos</h1>
          <span className="pill-primary">{prestamos.length}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-6 px-6">
        {prestamos.length === 0 ? (
          <div className="card-glass text-center py-12 text-slate-400">
            <p className="text-4xl mb-3">📭</p><p>No tenés préstamos registrados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prestamos.map(p => {
              const s = STATUS[p.estado_general] || STATUS.pendiente;
              const inicio = new Date(p.fecha_inicio);
              const limite = new Date(p.fecha_limite);
              return (
                <div key={p.id_prestamo} className="card-glass space-y-3">
                  {/* Top row: status pill + ID */}
                  <div className="flex items-center justify-between">
                    <span className={s.pill}>{s.icon} {s.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">#{p.id_prestamo.slice(0,8)}</span>
                  </div>

                  {/* Student info */}
                  <div>
                    <p className="font-semibold text-[#09488D]">{p.estudiante_nombre}</p>
                    {p.materia && <p className="text-xs text-slate-500 mt-0.5">{p.materia}{p.profesor_encargado ? ` · ${p.profesor_encargado}` : ""}</p>}
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="timeline-dot" />
                    <div className="flex-1 h-0.5 bg-slate-200 rounded" />
                    <div className={p.estado_general === "devuelto" ? "timeline-dot-active" : "w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white shadow-sm"} />
                    <div className="flex-1 h-0.5 bg-slate-200 rounded" />
                    <div className={p.estado_general === "devuelto" ? "timeline-dot-active" : "w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white shadow-sm"} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{inicio.toLocaleDateString("es-CO")}</span>
                    <span>{limite.toLocaleDateString("es-CO")}</span>
                  </div>

                  {/* Monitor footer */}
                  {p.monitor_nombre && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      Validado por <span className="text-slate-600 font-medium">{p.monitor_nombre}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
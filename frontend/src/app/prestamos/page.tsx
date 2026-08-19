"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import FabScanner from "@/components/FabScanner";

interface Prestamo {
  id_prestamo: string; estudiante_nombre: string; monitor_nombre: string | null;
  estado_general: string; fecha_inicio: string; fecha_limite: string; materia: string | null; profesor_encargado: string | null;
  motivo_rechazo: string | null; id_monitor_validador: string | null; nombre_docente: string | null;
}

interface DetallesPopupProps {
  prestamo: Prestamo;
  onClose: () => void;
}

function DetallesPopup({ prestamo, onClose }: DetallesPopupProps) {
  const [detalles, setDetalles] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/prestamos/${prestamo.id_prestamo}/detalles`)
      .then(r => r.json()).then(setDetalles).catch(() => {});
  }, [prestamo.id_prestamo]);

  const inicio = new Date(prestamo.fecha_inicio);
  const limite = new Date(prestamo.fecha_limite);
  const s = STATUS[prestamo.estado_general] || { label: prestamo.estado_general, icon: "📋", pill: "pill-neutral" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#09488D]">Detalles del préstamo</h2>
            <span className="pill text-xs">{s.icon} {s.label}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div><p className="text-xs text-slate-400">Estudiante</p><p className="font-medium">{prestamo.estudiante_nombre}</p></div>
          <div><p className="text-xs text-slate-400">Monitor</p><p className="font-medium">{prestamo.monitor_nombre || "—"}</p></div>
          <div><p className="text-xs text-slate-400">Materia</p><p className="font-medium">{prestamo.materia || "—"}</p></div>
          <div><p className="text-xs text-slate-400">Profesor</p><p className="font-medium">{prestamo.profesor_encargado || "—"}</p></div>
          <div><p className="text-xs text-slate-400">Inicio</p><p className="font-medium">{inicio.toLocaleDateString("es-CO")}</p></div>
          <div><p className="text-xs text-slate-400">Límite</p><p className="font-medium">{limite.toLocaleDateString("es-CO")}</p></div>
        </div>

        {prestamo.motivo_rechazo && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
            <p className="text-xs font-medium text-rose-600 mb-0.5">Motivo del rechazo:</p>
            <p className="text-sm text-rose-700">{prestamo.motivo_rechazo}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-slate-400 font-medium mb-2">Artículos prestados:</p>
          {detalles.length === 0 ? (
            <p className="text-sm text-slate-300">Cargando...</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {detalles.map((d: any) => (
                <div key={d.id_detalle} className="flex items-center justify-between bg-[#F4F6F9] rounded-lg px-3 py-2 text-sm">
                  <span className="text-slate-700">{d.nombre_activo || d.activo_nombre}</span>
                  <span className="text-xs text-slate-400">{d.activo_tipo} · {d.cantidad_entregada} ud {d.esta_devuelto ? "✅" : "📦"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} className="btn-ghost w-full text-sm">Cerrar</button>
      </div>
    </div>
  );
}

const STATUS: Record<string, { label: string; icon: string; pill: string }> = {
  pendiente: { label: "Pendiente", icon: "⏳", pill: "pill-accent" },
  activo: { label: "Activo", icon: "📦", pill: "pill-primary" },
  devuelto: { label: "Devuelto", icon: "✅", pill: "pill-success" },
  pendiente: { label: "Pendiente", icon: "⏳", pill: "pill-accent" },
  mora: { label: "En Mora", icon: "🚨", pill: "pill-danger" },
  mora: { label: "En Mora", icon: "🚨", pill: "pill-danger" },
  rechazado: { label: "Rechazado", icon: "✕", pill: "pill-danger" },
};

export default function PrestamosPage() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [detallePopup, setDetallePopup] = useState<Prestamo | null>(null);

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
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-[#09488D]">Préstamos</h1>
          <span className="pill-primary">{prestamos.length}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-6 px-6">
        {prestamos.length === 0 ? (
          <div className="card-glass text-center py-12 text-slate-400">
            <p className="text-4xl mb-3">📭</p><p>No hay préstamos registrados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prestamos.map(p => {
              const s = STATUS[p.estado_general] || STATUS.activo;
              const inicio = new Date(p.fecha_inicio);
              const limite = new Date(p.fecha_limite);
              return (
                <div key={p.id_prestamo} className="card-glass space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`pill text-xs ${s.pill}`}>{s.icon} {s.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">#{p.id_prestamo.slice(0,8)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#09488D]">{p.estudiante_nombre}</p>
                    {p.materia && <p className="text-xs text-slate-500 mt-0.5">{p.materia}{p.profesor_encargado ? ` · ${p.profesor_encargado}` : ""}</p>}
                  </div>
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
                  {(p.estado_general === "activo" || p.estado_general === "mora") && (() => {
                    const ahora = new Date();
                    const diff = Math.ceil((limite.getTime() - ahora.getTime()) / 86400000);
                    if (diff > 5) return <p className="text-[11px] font-medium text-emerald-600 mt-1">🟢 Quedan {diff} días</p>;
                    if (diff > 2) return <p className="text-[11px] font-medium text-amber-600 mt-1">🟡 Quedan {diff} días</p>;
                    if (diff > 0) return <p className="text-[11px] font-medium text-rose-600 mt-1">🔴 Solo {diff} {diff === 1 ? "día" : "días"}!</p>;
                    return <p className="text-[11px] font-bold text-rose-700 mt-1">🚨 Vencido hace {Math.abs(diff)} días</p>;
                  })()}
                  {p.monitor_nombre && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      Monitor: <span className="text-slate-600 font-medium">{p.monitor_nombre}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setDetallePopup(p)}
                    className="btn-soft w-full text-xs mt-1"
                  >
                    Ver más detalles
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detallePopup && <DetallesPopup prestamo={detallePopup} onClose={() => setDetallePopup(null)} />}

      <FabScanner />
    </div>
  );
}

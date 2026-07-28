"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Prestamo {
  id_prestamo: string; estudiante_nombre: string; estado_general: string;
  materia: string | null; profesor_encargado: string | null; fecha_limite: string; id_estudiante: string;
}

export default function AprobarPage() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalles, setDetalles] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetch("/api/prestamos")
      .then(r => r.json())
      .then(async (data) => {
        const pends = data.filter((p: Prestamo) => p.estado_general === "pendiente");
        setPendientes(pends);
        // Load details for each
        for (const p of pends) {
          fetch(`/api/prestamos/${p.id_prestamo}/detalles`)
            .then(r => r.json())
            .then(d => setDetalles(prev => ({ ...prev, [p.id_prestamo]: d })))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function aprobar(id: string) {
    try {
      const res = await fetch(`/api/prestamos/${id}/aprobar`, { method: "POST" });
      if (res.ok) {
        toast.success("Préstamo aprobado");
        setPendientes(prev => prev.filter(p => p.id_prestamo !== id));
      } else {
        const e = await res.json();
        toast.error(e.error || "Error al aprobar");
      }
    } catch { toast.error("Error de conexión"); }
  }

  async function rechazar(id: string) {
    const motivo = prompt("Motivo del rechazo (opcional):");
    if (motivo === null) return; // cancelled
    try {
      const res = await fetch(`/api/prestamos/${id}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo || "Rechazado" }),
      });
      if (res.ok) {
        toast.success("Préstamo rechazado");
        setPendientes(prev => prev.filter(p => p.id_prestamo !== id));
      } else {
        const e = await res.json();
        toast.error(e.error || "Error");
      }
    } catch { toast.error("Error de conexión"); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <div className="w-8 h-8 border-2 border-[#09488D] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <div className="bg-white border-b border-gray-100 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">✅</span>
            <h1 className="text-2xl font-bold text-[#09488D]">Aprobar Préstamos</h1>
            <span className="pill-accent">{pendientes.length} pendientes</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Estas son las solicitudes de estudiantes que necesitan material del laboratorio. Revisá cada una y aprobá o rechazá según corresponda.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 px-6 space-y-4">
        {pendientes.length === 0 ? (
          <div className="card-glass text-center py-12 text-slate-400">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-lg font-medium">No hay préstamos pendientes</p>
            <p className="text-sm mt-1">Volvé cuando haya nuevas solicitudes.</p>
          </div>
        ) : (
          pendientes.map(p => {
            const items = detalles[p.id_prestamo] || [];
            const limite = new Date(p.fecha_limite);
            return (
              <div key={p.id_prestamo} className="card-glass space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="pill-accent text-xs font-semibold">⏳ Pendiente</span>
                      <span className="text-[10px] text-slate-400 font-mono">#{p.id_prestamo.slice(0, 8)}</span>
                    </div>
                    <p className="font-bold text-[#09488D] text-lg">{p.estudiante_nombre}</p>
                    <div className="flex gap-4 mt-1 text-sm text-slate-500">
                      {p.materia && <span>📚 {p.materia}</span>}
                      {p.profesor_encargado && <span>👨‍🏫 {p.profesor_encargado}</span>}
                      <span>📅 {limite.toLocaleDateString("es-CO")}</span>
                    </div>
                  </div>
                </div>

                {/* Items list */}
                {items.length > 0 && (
                  <div className="bg-[#F4F6F9] rounded-xl p-3 space-y-1">
                    <p className="text-xs text-slate-400 font-medium mb-1">Material solicitado:</p>
                    {items.map((it: any) => (
                      <div key={it.id_detalle} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{it.nombre_activo || it.activo_nombre}</span>
                        <span className="text-xs text-slate-400">{it.activo_tipo} · {it.cantidad_entregada} ud</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => aprobar(p.id_prestamo)} className="btn-primary flex-1 text-sm">
                    ✅ Aprobar
                  </button>
                  <button onClick={() => rechazar(p.id_prestamo)} className="btn-soft flex-1 text-sm border border-rose-200 text-rose-600 hover:bg-rose-50">
                    ✕ Rechazar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
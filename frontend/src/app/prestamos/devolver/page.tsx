"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Prestamo {
  id_prestamo: string; estudiante_nombre: string; estudiante_codigo: string;
  estado_general: string; fecha_inicio: string; fecha_limite: string; materia: string | null;
}

interface Detalle {
  id_detalle: string; activo_nombre: string; activo_tipo: string; cantidad_entregada: number; esta_devuelto: boolean;
}

const ESTADOS_ACTIVO = ["disponible", "dañado", "mantenimiento"] as const;

export default function DevolverPage() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [devueltos, setDevueltos] = useState<Set<string>>(new Set());
  const [estados, setEstados] = useState<Record<string, string>>({});
  const [observacionesPerItem, setObservacionesPerItem] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch("/api/prestamos")
      .then(r => r.json())
      .then(d => setPrestamos(d.filter((p: Prestamo) => p.estado_general === "activo")))
      .catch(() => {});
  }, []);

  const filtrados = prestamos.filter(p =>
    p.estudiante_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.estudiante_codigo && p.estudiante_codigo.includes(busqueda))
  );

  async function seleccionar(id: string) {
    setSeleccionado(id);
    const res = await fetch(`/api/prestamos/${id}/detalles`);
    if (res.ok) {
      const data = await res.json();
      setDetalles(data);
      setDevueltos(new Set());
      setEstados({});
      setObservacionesPerItem({});
    }
  }

  function toggle(d: Detalle) {
    const n = new Set(devueltos);
    if (n.has(d.id_detalle)) {
      n.delete(d.id_detalle);
      const newObs = { ...observacionesPerItem };
      delete newObs[d.id_detalle];
      setObservacionesPerItem(newObs);
    } else {
      n.add(d.id_detalle);
    }
    setDevueltos(n);
  }

  function setObsPerItem(id: string, value: string) {
    setObservacionesPerItem(prev => ({ ...prev, [id]: value }));
  }

  async function confirmar() {
    if (!seleccionado) return;
    const items = detalles.map(d => ({
      id_detalle: d.id_detalle,
      observacion: devueltos.has(d.id_detalle) ? (observacionesPerItem[d.id_detalle] || null) : null,
      estado_final: estados[d.id_detalle] || "disponible",
    }));
    try {
      const res = await fetch(`/api/prestamos/${seleccionado}/devolver`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items_devueltos: items }),
      });
      if (res.ok) {
        toast.success("Devolución registrada");
        setSeleccionado(null); setDetalles([]);
        fetch("/api/prestamos").then(r => r.json()).then(d => setPrestamos(d.filter((p: Prestamo) => p.estado_general === "activo")));
      } else {
        const e = await res.json();
        toast.error(e.error || "Error");
      }
    } catch { toast.error("Error de conexión"); }
  }

  function diasRestantes(fechaLimite: string) {
    const ahora = new Date();
    const limite = new Date(fechaLimite);
    return Math.ceil((limite.getTime() - ahora.getTime()) / 86400000);
  }

  function urgencia(diff: number) {
    if (diff <= 2) return { color: "bg-rose-500", text: "text-rose-600", label: "Urgente" };
    if (diff <= 5) return { color: "bg-amber-400", text: "text-amber-600", label: "Próximo" };
    return { color: "bg-emerald-400", text: "text-emerald-600", label: "A tiempo" };
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🔄</span>
            <h1 className="text-xl md:text-2xl font-bold text-[#09488D]">Devoluciones</h1>
            <span className="pill-primary">{prestamos.length} activos</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Registrá la devolución de material prestado.</p>
          <input
            type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código de estudiante..."
            className="input-glass max-w-md mt-4"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 px-4 md:px-6">
        {!seleccionado ? (
          <div className="space-y-3">
            {filtrados.length === 0 ? (
              <div className="card-glass text-center py-12 text-slate-400">
                <p className="text-4xl mb-2">📭</p><p>No hay préstamos activos.</p>
              </div>
            ) : (
              filtrados.map(p => {
                const diff = diasRestantes(p.fecha_limite);
                const urg = urgencia(diff);
                return (
                  <div key={p.id_prestamo} onClick={() => seleccionar(p.id_prestamo)}
                    className="card-white cursor-pointer hover:-translate-y-0.5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[#09488D]">{p.estudiante_nombre}</p>
                        <p className="text-xs text-slate-400">{p.materia || "Sin materia"} · #{p.id_prestamo.slice(0,8)}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${urg.text}`}>
                        {urg.label} ({diff}d)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${urg.color}`}
                          style={{ width: `${Math.max(0, Math.min(100, ((30 - diff) / 30) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-12 text-right">{diff}d</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Inicio: {new Date(p.fecha_inicio).toLocaleDateString("es-CO")}</span>
                      <span>Límite: {new Date(p.fecha_limite).toLocaleDateString("es-CO")}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="card-glass space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#09488D] text-lg">Confirmar devolución</h2>
              <button onClick={() => setSeleccionado(null)} className="btn-ghost text-sm">← Volver</button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {detalles.map(d => {
                const marcado = devueltos.has(d.id_detalle);
                return (
                  <div key={d.id_detalle} onClick={() => toggle(d)}
                    className={`flex flex-col rounded-xl p-4 cursor-pointer transition-all border ${
                      marcado ? "bg-emerald-50/60 border-emerald-200 shadow-sm" : "bg-[#F4F6F9] border-transparent hover:border-slate-200"
                    }`}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        marcado ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                      }`}>
                        {marcado && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${marcado ? "text-emerald-700" : "text-slate-700"}`}>
                          {d.activo_nombre}
                        </p>
                        <p className="text-xs text-slate-400">
                          {d.activo_tipo === "trazable" ? "🔍 Trazable" : "📦 Consumible"} · Cantidad: {d.cantidad_entregada}
                        </p>
                      </div>
                    </div>

                    {marcado && (
                      <div className="mt-3 ml-8 space-y-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={observacionesPerItem[d.id_detalle] || ""}
                          onChange={e => setObsPerItem(d.id_detalle, e.target.value)}
                          placeholder="Observación (opcional)..."
                          className="w-full text-xs border border-emerald-200 rounded-lg px-2 py-1.5 bg-white outline-none"
                        />
                        <select
                          value={estados[d.id_detalle] || "disponible"}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setEstados({ ...estados, [d.id_detalle]: e.target.value })}
                          className="text-xs border border-emerald-200 rounded-lg px-2 py-1.5 bg-white text-emerald-700 font-medium cursor-pointer"
                        >
                          {ESTADOS_ACTIVO.map(e => <option key={e} value={e}>
                            {e === "disponible" ? "✅ " + e : e === "dañado" ? "⚠️ " + e : "🔧 " + e}
                          </option>)}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={confirmar}
              disabled={devueltos.size === 0 || devueltos.size < detalles.length}
              className="btn-primary w-full text-sm"
            >
              {devueltos.size === 0
                ? "Seleccioná todos los artículos"
                : devueltos.size < detalles.length
                  ? `Faltan ${detalles.length - devueltos.size} artículos`
                  : `Confirmar Devolución (${devueltos.size})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
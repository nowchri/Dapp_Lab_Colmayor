"use client";

import { useEffect, useState } from "react";

interface Activo {
  id_activo: string; nombre_activo: string; codigo_qr: string | null;
  tipo: "trazable" | "consumible"; estado: string; nombre_categoria: string | null; stock_actual: number | null;
}

// ─── Category color map ───
const CAT_COLORS: Record<string, string> = {
  "microcontroladores": "border-l-blue-400 bg-blue-50/40",
  "sensores": "border-l-emerald-400 bg-emerald-50/40",
  "actuadores": "border-l-amber-400 bg-amber-50/40",
  "herramientas": "border-l-slate-400 bg-slate-50/40",
  "cables": "border-l-violet-400 bg-violet-50/40",
  "kits": "border-l-rose-400 bg-rose-50/40",
  "consumibles": "border-l-cyan-400 bg-cyan-50/40",
  "raspberry": "border-l-pink-400 bg-pink-50/40",
  "arduino": "border-l-teal-400 bg-teal-50/40",
  "medicion": "border-l-indigo-400 bg-indigo-50/40",
};

function catColor(nombre: string | null): string {
  if (!nombre) return "border-l-gray-300 bg-white";
  const key = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [k, v] of Object.entries(CAT_COLORS)) {
    if (key.includes(k)) return v;
  }
  // Hash-based fallback — always same color for same category
  const colors = ["border-l-blue-300","border-l-emerald-300","border-l-amber-300","border-l-violet-300","border-l-rose-300","border-l-cyan-300","border-l-teal-300","border-l-indigo-300"];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return `${colors[Math.abs(h) % colors.length]} bg-white`;
}

const ESTADO_ICON: Record<string, string> = {
  disponible: "🟢", prestado: "📦", "dañado": "⚠️", mantenimiento: "🔧", incompleto: "🧩",
};

function Modal({ activo, rol, onClose, onAgregarBolsa, onSolicitarYa, enCarrito }: {
  activo: Activo | null; rol: string; onClose: () => void;
  onAgregarBolsa: (a: Activo) => void; onSolicitarYa: (a: Activo) => void; enCarrito: boolean;
}) {
  if (!activo) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white/95 backdrop-blur rounded-[14px] p-6 max-w-md w-full m-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-[#09488D]">{activo.nombre_activo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={activo.tipo === "trazable" ? "pill-primary" : "pill-accent"}>{activo.tipo === "trazable" ? "Trazable" : "Consumible"}</span>
          <span className="pill-neutral">{activo.nombre_categoria || "Sin categoría"}</span>
          {activo.stock_actual != null && <span className="text-xs text-slate-500">Stock: {activo.stock_actual}</span>}
        </div>
        {(rol === "monitor" || rol === "admin") && activo.codigo_qr && (
          <div className="flex items-center gap-3 bg-[#F4F6F9] p-3 rounded-xl">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(activo.codigo_qr)}`} alt="QR" className="w-20 h-20 rounded-lg border bg-white" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] text-gray-500 break-all">{activo.codigo_qr}</p>
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(activo.codigo_qr)}`} download={`QR-${activo.nombre_activo.replace(/\s+/g,"_")}.png`} className="text-xs text-[#09488D] hover:underline mt-1 inline-block">📥 Descargar</a>
            </div>
          </div>
        )}
        {rol === "estudiante" && activo.codigo_qr && (
          <p className="font-mono text-xs text-gray-500 bg-[#F4F6F9] p-2 rounded-lg">QR: {activo.codigo_qr}</p>
        )}
        {rol === "estudiante" && activo.estado === "disponible" && (
          <div className="flex gap-2 pt-2">
            <button onClick={() => onAgregarBolsa(activo)} className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${enCarrito ? "bg-red-50 text-red-600 border border-red-200" : "btn-outline"}`}>{enCarrito ? "Quitar" : "Agregar a bolsa"}</button>
            <button onClick={() => onSolicitarYa(activo)} className="flex-1 btn-primary text-sm">Solicitar ya</button>
          </div>
        )}
        <button onClick={onClose} className="btn-ghost w-full text-sm">Cerrar</button>
      </div>
    </div>
  );
}

export default function InventarioPage() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<Activo | null>(null);
  const [rol, setRol] = useState("estudiante");
  const [carrito, setCarrito] = useState<Activo[]>([]);

  useEffect(() => {
    fetch("/api/inventario").then(r => r.json()).then(setActivos).catch(() => {});
    const c = document.cookie.split("; ").find(r => r.startsWith("userRol="));
    if (c) setRol(c.split("=")[1]);
  }, []);

  function agregarAlCarrito(a: Activo) { setCarrito(p => p.find(c => c.id_activo === a.id_activo) ? p.filter(c => c.id_activo !== a.id_activo) : [...p, a]); }
  function solicitarYa(a: Activo) { window.location.href = "/prestamos/nuevo?items=" + a.id_activo; }
  function irABolsa() { if (carrito.length) window.location.href = "/prestamos/nuevo?items=" + carrito.map(c => c.id_activo).join(","); }

  const filtrados = activos.filter(a =>
    (filtro === "todos" || a.tipo === filtro || a.estado === filtro) &&
    (!busqueda || a.nombre_activo.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold text-[#09488D]">Inventario</h1>
            <span className="pill-primary">{activos.length} activos</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["todos","trazable","consumible","disponible","prestado"].map(f => (
              <button key={f} onClick={() => setFiltro(f)} className={filtro === f ? "chip chip-active" : "chip"}>
                {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..." className="input-glass max-w-[200px] ml-auto" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 px-6">
        {rol === "estudiante" && carrito.length > 0 && (
          <div className="mb-4 flex items-center gap-3 bg-[#09488D] text-white p-3 rounded-[14px] shadow-lg sticky top-[60px] z-10">
            <span>🛒 {carrito.length} items</span>
            <button onClick={irABolsa} className="bg-white text-[#09488D] px-4 py-1 rounded-lg text-sm font-medium">Ir a solicitar</button>
            <button onClick={() => setCarrito([])} className="text-white/70 text-sm">Vaciar</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(a => {
            const borderColor = catColor(a.nombre_categoria);
            return (
              <div key={a.id_activo} onClick={() => setModal(a)}
                className={`card-white cursor-pointer border-l-[3px] ${borderColor} hover:-translate-y-0.5`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">{a.nombre_categoria || "Sin categoría"}</span>
                    <h3 className="font-semibold text-[#09488D] mt-0.5">{a.nombre_activo}</h3>
                  </div>
                  <span>{ESTADO_ICON[a.estado] || "❓"}</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className={a.tipo === "trazable" ? "pill-primary" : "pill-accent"}>
                    {a.tipo === "trazable" ? "QR" : "Stock"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.estado === "disponible" ? "bg-emerald-50 text-emerald-600" :
                    a.estado === "prestado" ? "bg-sky-50 text-sky-600" :
                    "bg-rose-50 text-rose-600"
                  }`}>{a.estado}</span>
                  {a.stock_actual != null && <span className="text-xs text-slate-400 ml-auto">Stock: {a.stock_actual}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {filtrados.length === 0 && <p className="text-center py-12 text-gray-400">No se encontraron activos.</p>}

        <Modal activo={modal} rol={rol} onClose={() => setModal(null)}
          onAgregarBolsa={agregarAlCarrito} onSolicitarYa={solicitarYa}
          enCarrito={!!modal && carrito.some(c => c.id_activo === modal.id_activo)} />
      </div>
    </div>
  );
}
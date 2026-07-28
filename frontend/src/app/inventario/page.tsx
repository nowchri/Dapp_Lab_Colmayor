"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import FabScanner from "@/components/FabScanner";

interface Activo {
  id_activo: string; nombre_activo: string; codigo_qr: string | null;
  tipo: "trazable" | "consumible"; estado: string; nombre_categoria: string | null; stock_actual: number | null;
  componentes: number;
}

const ESTADO_ICON: Record<string, string> = {
  disponible: "🟢", prestado: "📦", "dañado": "⚠️", mantenimiento: "🔧", incompleto: "🧩",
};

function catColor(nombre: string | null): string {
  if (!nombre) return "border-l-gray-300 bg-white";
  const key = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const map: Record<string, string> = {
    microcontroladores: "border-l-blue-400", sensores: "border-l-emerald-400", actuadores: "border-l-amber-400",
    herramientas: "border-l-slate-400", cables: "border-l-violet-400", kits: "border-l-amber-400",
  };
  for (const [k, v] of Object.entries(map)) if (key.includes(k)) return v;
  const colors = ["border-l-blue-300","border-l-emerald-300","border-l-amber-300","border-l-violet-300"];
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length] + " bg-white";
}

function KitChildren({ parentId, parentName }: { parentId: string; parentName: string }) {
  const [kids, setKids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/inventario/${parentId}/children`).then(r => r.json()).then(setKids).catch(() => {}).finally(() => setLoading(false));
  }, [parentId]);
  if (loading) return <div className="text-xs text-slate-400 py-2">Cargando...</div>;
  if (kids.length === 0) return <p className="text-xs text-slate-400 py-1">Sin componentes registrados.</p>;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
      <p className="text-xs font-semibold text-amber-700 mb-2">🧩 Este kit incluye {kids.length} componente(s):</p>
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {kids.map((k: any) => (
          <div key={k.id_activo} className="flex items-center justify-between text-sm bg-white rounded-lg px-2 py-1.5">
            <span className="text-slate-700 truncate">{k.nombre_activo}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${k.estado === "disponible" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{k.estado}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Modal({ activo, rol, onClose, onAgregarBolsa, onSolicitarYa, enCarrito, onChangeEstado, categorias }: {
  activo: Activo | null; rol: string; onClose: () => void;
  onAgregarBolsa: (a: Activo) => void; onSolicitarYa: (a: Activo) => void; enCarrito: boolean;
  onChangeEstado: (id: string, estado: string) => void; categorias: any[];
}) {
  if (!activo) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white/95 rounded-[14px] p-6 max-w-md w-full m-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-[#09488D]">{activo.nombre_activo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={activo.tipo === "trazable" ? "pill-primary" : "pill-accent"}>{activo.tipo === "trazable" ? "Trazable" : "Consumible"}</span>
          <span className="pill-neutral">{activo.nombre_categoria || "Sin categoria"}</span>
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
          <div className="flex items-center gap-3 bg-[#F4F6F9] p-3 rounded-xl">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(activo.codigo_qr)}`} alt="QR" className="w-20 h-20 rounded-lg border bg-white" />
            <div className="min-w-0"><p className="font-mono text-[10px] text-gray-500 break-all">{activo.codigo_qr}</p></div>
          </div>
        )}

        {activo.componentes > 0 && <KitChildren parentId={activo.id_activo} parentName={activo.nombre_activo} />}

        {(rol === "monitor" || rol === "admin") && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Categoria:</p>
              <select
                value={(activo as any).id_categoria || ""}
                onChange={async (e) => {
                  try {
                    await fetch(`/api/inventario/${activo.id_activo}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_categoria: e.target.value || null }) });
                    toast.success("Categoria actualizada");
                    onClose();
                  } catch { toast.error("Error"); }
                }}
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">Sin categoria</option>
                {categorias.map((c: any) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Cambiar estado:</p>
              <div className="flex gap-1.5 flex-wrap">
                {["disponible","dañado","mantenimiento"].map(e => e === activo.estado ? null : (
                  <button key={e} onClick={() => onChangeEstado(activo.id_activo, e)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${e === "disponible" ? "border-emerald-300 text-emerald-600 hover:bg-emerald-50" : e === "dañado" ? "border-rose-300 text-rose-600 hover:bg-rose-50" : "border-amber-300 text-amber-600 hover:bg-amber-50"}`}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
  const [categorias, setCategorias] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<Activo | null>(null);
  const [rol, setRol] = useState("estudiante");
  const [carrito, setCarrito] = useState<Activo[]>([]);

  useEffect(() => {
    fetch("/api/inventario").then(r => r.json()).then(setActivos).catch(() => {});
    fetch("/api/categorias").then(r => r.json()).then(setCategorias).catch(() => {});
    const c = document.cookie.split("; ").find(r => r.startsWith("userRol="));
    if (c) setRol(c.split("=")[1]);
  }, []);

  async function cambiarEstado(id: string, nuevoEstado: string) {
    try {
      const res = await fetch(`/api/inventario/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: nuevoEstado }) });
      if (res.ok) {
        setActivos(prev => prev.map(a => a.id_activo === id ? { ...a, estado: nuevoEstado } : a));
        setModal(prev => prev && prev.id_activo === id ? { ...prev, estado: nuevoEstado } : prev);
        toast.success("Estado actualizado");
      } else { const e = await res.json(); toast.error(e.error || "Error"); }
    } catch { toast.error("Error de conexion"); }
  }

  function agregarAlCarrito(a: Activo) { setCarrito(p => p.find(c => c.id_activo === a.id_activo) ? p.filter(c => c.id_activo !== a.id_activo) : [...p, a]); }
  function solicitarYa(a: Activo) { window.location.href = "/prestamos/nuevo?items=" + a.id_activo; }
  function irABolsa() { if (carrito.length) window.location.href = "/prestamos/nuevo?items=" + carrito.map(c => c.id_activo).join(","); }

  const filtrados = activos.filter(a => {
    let match = true;
    if (filtro === "kits") match = a.componentes > 0;
    else if (filtro !== "todos") match = a.tipo === filtro || a.estado === filtro;
    return match && (!busqueda || a.nombre_activo.toLowerCase().includes(busqueda.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold text-[#09488D]">Inventario</h1>
            <span className="pill-primary">{activos.length} activos</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["todos","trazable","consumible","disponible","prestado","kits"].map(f => (
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
          {filtrados.map(a => (
            <div key={a.id_activo} onClick={() => setModal(a)}
              className={`card-white cursor-pointer hover:-translate-y-0.5 border-l-0 ${
                a.estado === "disponible" ? "bg-emerald-100 border-emerald-300" :
                a.estado === "prestado" ? "bg-sky-100 border-sky-300" :
                a.estado === "dañado" ? "bg-rose-100 border-rose-300" :
                a.estado === "mantenimiento" ? "bg-amber-100 border-amber-300" :
                a.estado === "incompleto" ? "bg-amber-100 border-amber-300" : "bg-white"
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">{a.nombre_categoria || "Sin categoria"}</span>
                  <h3 className="font-semibold text-[#09488D] mt-0.5">{a.nombre_activo}</h3>
                </div>
                <span>{ESTADO_ICON[a.estado] || "❓"}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={a.tipo === "trazable" ? "pill-primary" : "pill-accent"}>{a.tipo === "trazable" ? "QR" : "Stock"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.estado === "disponible" ? "bg-emerald-200 text-emerald-700" :
                  a.estado === "prestado" ? "bg-sky-200 text-sky-700" :
                  a.estado === "incompleto" ? "bg-amber-200 text-amber-700" : "bg-rose-200 text-rose-700"
                }`}>{a.estado === "incompleto" ? "⚠️ incompleto" : a.estado}</span>
                {a.stock_actual != null && <span className="text-xs text-slate-400 ml-auto">Stock: {a.stock_actual}</span>}
                {a.componentes > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-auto">🧩 {a.componentes}</span>}
              </div>
            </div>
          ))}
        </div>

        {filtrados.length === 0 && <p className="text-center py-12 text-slate-400">No se encontraron activos.</p>}

        <Modal activo={modal} rol={rol} onClose={() => setModal(null)}
          onAgregarBolsa={agregarAlCarrito} onSolicitarYa={solicitarYa}
          enCarrito={!!modal && carrito.some(c => c.id_activo === modal.id_activo)}
          onChangeEstado={cambiarEstado} categorias={categorias} />
      </div>
      <FabScanner />
    </div>
  );
}

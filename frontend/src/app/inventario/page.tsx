"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import FabScanner from "@/components/FabScanner";
import QRScanner from "@/components/QRScanner";

interface Activo {
  id_activo: string; nombre_activo: string; codigo_qr: string | null;
  tipo: "trazable" | "consumible"; estado: string; nombre_categoria: string | null; nombre_area: string | null;
  componentes: number; observaciones_iniciales: string | null; stock_actual: number | null;
}

const ESTADO_ICON: Record<string, string> = {
  disponible: "🟢", prestado: "📦", "dañado": "⚠️", mantenimiento: "🔧", incompleto: "🧩",
};

function cardTheme(estado: string, tipo: string) {
  switch (estado) {
    case "prestado":
      return { card: "bg-sky-500 border-sky-600", name: "text-white", sub: "text-sky-100", dot: "bg-white" };
    case "dañado":
      return { card: "bg-rose-500 border-rose-600", name: "text-white", sub: "text-rose-100", dot: "bg-white" };
    case "mantenimiento":
      return { card: "bg-amber-400 border-amber-500", name: "text-amber-950", sub: "text-amber-900", dot: "bg-amber-700" };
    case "incompleto":
      return { card: "bg-amber-100 border-amber-400 border-dashed", name: "text-[#09488D]", sub: "text-slate-500", dot: "bg-amber-500" };
    case "disponible":
    default:
      if (tipo === "consumible") {
        return { card: "bg-white border-amber-300", name: "text-[#09488D]", sub: "text-slate-500", dot: "bg-emerald-500" };
      }
      return { card: "bg-white border-emerald-200", name: "text-[#09488D]", sub: "text-slate-500", dot: "bg-emerald-500" };
  }
}

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

function Modal({ activo, rol, onClose, onAgregarBolsa, onSolicitarYa, enCarrito, onChangeEstado, onChangeStock, onChangeObs, categorias }: {
  activo: Activo | null; rol: string; onClose: () => void;
  onAgregarBolsa: (a: Activo) => void; onSolicitarYa: (a: Activo) => void; enCarrito: boolean;
  onChangeEstado: (id: string, estado: string) => void; onChangeStock: (id: string, stock: number) => void; onChangeObs: (id: string, obs: string) => void; categorias: any[];
}) {
  const [stockInput, setStockInput] = useState(activo?.stock_actual ?? 0);
  const [obsInput, setObsInput] = useState((activo as any)?.observaciones_iniciales ?? "");
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
          <span className="pill-neutral">{activo.nombre_area && activo.nombre_area + " · "}{activo.nombre_categoria || "Sin categoria"}</span>
          {activo.tipo === "consumible" && (
            <span className={`pill ${(activo.stock_actual ?? 0) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              📦 Stock: {activo.stock_actual ?? 0}
            </span>
          )}
          
        </div>

        {activo.codigo_qr && (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center text-center bg-[#F4F6F9]">
            <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-200">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activo.codigo_qr)}`} alt="QR" className="w-32 h-32" />
            </div>
            <p className="font-mono text-[10px] text-slate-600 break-all mt-2">{activo.codigo_qr}</p>
            <p className="text-sm font-bold text-[#09488D] mt-1">{activo.nombre_activo}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{activo.nombre_area || ""}{activo.nombre_categoria ? " · " + activo.nombre_categoria : ""}</p>
            <p className="text-[9px] text-slate-400 mt-1">UNIMAYOR · LAB</p>
            {(rol === "admin" || rol === "monitor") && (
              <a href={`/api/reports/sticker/${activo.id_activo}`} target="_blank" rel="noopener" className="text-xs bg-[#09488D] text-white px-4 py-1.5 rounded-lg hover:bg-[#073a6b] transition mt-2 inline-block">📥 Descargar sticker</a>
            )}
          </div>
        )}

        {(activo as any).observaciones_iniciales && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs font-medium text-slate-500 mb-1">📝 Observaciones:</p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{(activo as any).observaciones_iniciales}</p>
          </div>
        )}

        {activo.componentes > 0 && <KitChildren parentId={activo.id_activo} parentName={activo.nombre_activo} />}

        {(rol === "monitor" || rol === "admin") && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            {activo.tipo === "consumible" && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400 shrink-0">Stock:</p>
                <input
                  type="number" min="0"
                  value={stockInput}
                  onChange={e => setStockInput(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-[#09488D]"
                />
                <button
                  onClick={() => onChangeStock(activo.id_activo, stockInput)}
                  disabled={stockInput === (activo.stock_actual ?? 0)}
                  className="text-xs bg-[#09488D] text-white px-3 py-1.5 rounded-lg hover:bg-[#073a6b] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Guardar
                </button>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 mb-1">📝 Observaciones:</p>
              <textarea
                value={obsInput}
                onChange={e => setObsInput(e.target.value)}
                rows={2}
                placeholder="Ej: Falta cable USB, requiere calibración..."
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-[#09488D] resize-none"
              />
              <button
                onClick={() => onChangeObs(activo.id_activo, obsInput)}
                disabled={obsInput === ((activo as any).observaciones_iniciales || "")}
                className="mt-1.5 text-xs bg-[#09488D] text-white px-3 py-1.5 rounded-lg hover:bg-[#073a6b] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Guardar observaciones
              </button>
            </div>
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
                {["disponible","dañado","mantenimiento","incompleto"].map(e => e === activo.estado ? null : (
                  <button key={e} onClick={() => onChangeEstado(activo.id_activo, e)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${e === "disponible" ? "border-emerald-300 text-emerald-600 hover:bg-emerald-50" : e === "dañado" ? "border-rose-300 text-rose-600 hover:bg-rose-50" : e === "mantenimiento" ? "border-amber-300 text-amber-600 hover:bg-amber-50" : "border-amber-400 border-dashed text-amber-700 hover:bg-amber-50"}`}>
                    {e === "incompleto" ? " Incompleto" : e.charAt(0).toUpperCase() + e.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {rol === "estudiante" && (activo.estado === "disponible" || activo.estado === "incompleto") && (
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

function ComprobarModal({ activos, onClose }: { activos: Activo[]; onClose: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<Activo | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [scanning, setScanning] = useState(false);

  function buscar(code: string) {
    const sc = (code || "").toLowerCase().trim();
    if (!sc) return;
    setBuscando(true);
    const match = activos.find(a => {
      const cqr = (a.codigo_qr || "").toLowerCase().trim();
      return cqr === sc || a.id_activo === sc;
    });
    setResultado(match || null);
    setBuscando(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white/95 rounded-[14px] p-6 max-w-md w-full m-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-[#09488D]">✅ Comprobar activo</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
          <p className="text-xs text-slate-400 -mt-2">Escribí el código del activo que tenés en la mano, o escanealo con la cámara.</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") buscar(codigo); }}
              placeholder="Código QR o ID del activo..."
              className="input-glass flex-1 text-sm"
              autoFocus
            />
            <button onClick={() => buscar(codigo)} disabled={buscando} className="btn-primary text-xs shrink-0">
              {buscando ? "..." : "Buscar"}
            </button>
          </div>
          <button onClick={() => setScanning(true)} className="btn-outline w-full text-sm">
            📷 Escanear con cámara
          </button>

          {resultado !== null && (
            <div className={`rounded-xl p-4 ${resultado.estado === "disponible" ? "bg-emerald-50 border border-emerald-200" : resultado.estado === "prestado" ? "bg-blue-50 border border-blue-200" : resultado.estado === "dañado" ? "bg-rose-50 border border-rose-200" : "bg-amber-50 border border-amber-200"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{resultado.nombre_activo}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{resultado.nombre_area || ""}{resultado.nombre_categoria ? " · " + resultado.nombre_categoria : ""}</p>
                </div>
                <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                  resultado.estado === "disponible" ? "bg-emerald-600 text-white" :
                  resultado.estado === "prestado" ? "bg-blue-600 text-white" :
                  resultado.estado === "dañado" ? "bg-rose-600 text-white" :
                  "bg-amber-500 text-white"
                }`}>
                  {resultado.estado === "incompleto" ? "incompleto" : resultado.estado}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-white text-slate-600">{resultado.tipo === "trazable" ? "Trazable" : "Consumible"}</span>
                {resultado.tipo === "consumible" && (
                  <span className={`px-2 py-0.5 rounded-full ${(resultado.stock_actual ?? 0) > 0 ? "bg-white text-emerald-700" : "bg-white text-rose-600"}`}>
                    📦 Stock: {resultado.stock_actual ?? 0}
                  </span>
                )}
                {resultado.componentes > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white text-amber-700">🧩 {resultado.componentes} componentes</span>
                )}
              </div>
              {(resultado as any).observaciones_iniciales && (
                <p className="mt-2 text-xs text-slate-600 bg-white/70 rounded-lg px-3 py-2 whitespace-pre-line">
                  📝 {(resultado as any).observaciones_iniciales}
                </p>
              )}
            </div>
          )}

          {resultado === null && codigo !== "" && !buscando && (
            <p className="text-xs text-rose-500 text-center">No se encontró ningún activo con ese código.</p>
          )}
        </div>
      </div>

      {scanning && (
        <QRScanner
          onScan={code => { setScanning(false); setCodigo(code); buscar(code); }}
          bagCount={0}
          onClose={() => setScanning(false)}
          showBagLink={false}
        />
      )}
    </>
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
  const [filtroArea, setFiltroArea] = useState("todas");
  const [areasList, setAreasList] = useState<any[]>([]);
  const [showComprobar, setShowComprobar] = useState(false);

    const areasUnicas = [...new Set(activos.map(a => a.nombre_area).filter(Boolean))] as string[];

  useEffect(() => {
    fetch("/api/inventario").then(r => r.json()).then(setActivos).catch(() => {});
    fetch("/api/categorias").then(r => r.json()).then(setCategorias).catch(() => {});
    fetch("/api/areas").then(r => r.json()).then(setAreasList).catch(() => {});
    const c = document.cookie.split("; ").find(r => r.startsWith("userRol="));
    if (c) setRol(c.split("=")[1]);

    // Escaneos del FAB: reflejarlos en la bolsa visible SIN consumir scannedBag
    // (scannedBag acumula todos los escaneos; lo consume la página de préstamo)
    const handleScan = () => {
      setActivos(prev => {
        const stored = localStorage.getItem("scannedBag");
        if (!stored) return prev;
        const codes = JSON.parse(stored) as string[];
        if (codes.length === 0) return prev;
        codes.forEach(code => {
          const sc = code.toLowerCase().trim();
          const match = prev.find(a => {
            const cqr = (a.codigo_qr || "").toLowerCase().trim();
            return cqr === sc || a.id_activo === sc;
          });
          if (match) {
            setCarrito(prevC => {
              if (prevC.find(p => p.id_activo === match.id_activo)) return prevC;
              toast.success(match.nombre_activo + " escaneado a la bolsa");
              return [...prevC, match];
            });
          }
        });
        return prev;
      });
    };
    window.addEventListener("scannedItemsChanged", handleScan);
    return () => window.removeEventListener("scannedItemsChanged", handleScan);
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

  async function cambiarObservaciones(id: string, obs: string) {
    try {
      const res = await fetch(`/api/inventario/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ observaciones_iniciales: obs }) });
      if (res.ok) {
        setActivos(prev => prev.map(a => a.id_activo === id ? { ...a, observaciones_iniciales: obs || null } : a));
        setModal(prev => prev && prev.id_activo === id ? { ...prev, observaciones_iniciales: obs || null } : prev);
        toast.success("Observaciones actualizadas");
      } else { const e = await res.json(); toast.error(e.error || "Error"); }
    } catch { toast.error("Error de conexion"); }
  }

  async function cambiarStock(id: string, nuevoStock: number) {
    try {
      const res = await fetch(`/api/inventario/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stock_actual: nuevoStock }) });
      if (res.ok) {
        setActivos(prev => prev.map(a => a.id_activo === id ? { ...a, stock_actual: nuevoStock } : a));
        setModal(prev => prev && prev.id_activo === id ? { ...prev, stock_actual: nuevoStock } : prev);
        toast.success("Stock actualizado");
      } else { const e = await res.json(); toast.error(e.error || "Error"); }
    } catch { toast.error("Error de conexion"); }
  }

  function agregarAlCarrito(a: Activo) { setCarrito(p => p.find(c => c.id_activo === a.id_activo) ? p.filter(c => c.id_activo !== a.id_activo) : [...p, a]); }
  function solicitarYa(a: Activo) { window.location.href = "/prestamos/nuevo?items=" + a.id_activo; }
  function irABolsa() { if (carrito.length) window.location.href = "/prestamos/nuevo?items=" + carrito.map(c => c.id_activo).join(","); }

  const filtrados = activos.filter(a => {
    let match = true;
    if (filtro === "kits") match = (a.nombre_categoria || "").toLowerCase().includes("kit");
    else if (filtro !== "todos") match = a.tipo === filtro || a.estado === filtro;
    if (filtroArea !== "todas") match = match && a.nombre_area === filtroArea;
    return match && (!busqueda || a.nombre_activo.toLowerCase().includes(busqueda.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-[#09488D]">Inventario</h1>
            <span className="pill-primary">{activos.length} activos</span>
            <button
              onClick={() => setShowComprobar(true)}
              className="ml-auto md:ml-0 text-xs font-medium bg-[#E8BD02] text-white px-3.5 py-1.5 rounded-lg hover:bg-[#073a6b] transition"
              title="Escaneá el QR del activo que tenés en la mano para comprobar su estado"
            >
              Comprobar activo
            </button>
          </div>
          {/* Search bar — full width on mobile */}
          <div className="mb-3">
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar activo..." className="input-glass w-full md:max-w-sm" />
          </div>

          {/* Filter chips row 1: estado */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {["todos","disponible","prestado","kits"].map(f => (
              <button key={f} onClick={() => setFiltro(f)} className={filtro === f ? "chip chip-active" : "chip"}>
                {f === "todos" ? "Todos" : f === "kits" ? "Kits" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Filter chips row 2: areas */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setFiltroArea("todas")} className={filtroArea === "todas" ? "chip chip-active" : "chip"}>Todas las áreas</button>
            {areasList.map((area: any) => (
              <button key={area.nombre_area} onClick={() => setFiltroArea(area.nombre_area)} className={filtroArea === area.nombre_area ? "chip chip-active" : "chip"}>
                {area.nombre_area}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 px-6">
        {rol === "estudiante" && carrito.length > 0 && (
          <div className="mb-4 flex items-center gap-3 bg-[#09488D] text-white p-2 md:p-3 rounded-[14px] shadow-lg sticky top-[56px] z-10">
            <span>🛒 {carrito.length} items</span>
            <button onClick={irABolsa} className="bg-white text-[#09488D] px-4 py-1 rounded-lg text-sm font-medium">Ir a solicitar</button>
            <button onClick={() => setCarrito([])} className="text-white/70 text-sm">Vaciar</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(a => {
            const th = cardTheme(a.estado, a.tipo);
            return (
            <div key={a.id_activo} onClick={() => setModal(a)}
              className={`card-white cursor-pointer hover:-translate-y-0.5 ${th.card}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[10px] uppercase tracking-wide ${th.sub}`}>{a.nombre_area || ""}{a.nombre_categoria ? " · " + a.nombre_categoria : ""}</span>
                  <h3 className={`font-semibold mt-0.5 ${th.name}`}>{a.nombre_activo}</h3>
                </div>
                <span className={`w-3 h-3 rounded-full shrink-0 mt-1 ${th.dot}`} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={a.tipo === "trazable" ? "pill-primary" : "pill-accent"}>{a.tipo === "trazable" ? "Trazable" : "Consumible"}</span>
                {a.tipo === "consumible" && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(a.stock_actual ?? 0) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    Stock: {a.stock_actual ?? 0}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.estado === "disponible" ? "bg-emerald-100 text-emerald-700" :
                  a.estado === "prestado" ? "bg-white/30 text-white" :
                  a.estado === "dañado" ? "bg-white/30 text-white" :
                  a.estado === "mantenimiento" ? "bg-amber-100 text-amber-800" :
                  "bg-amber-200 text-amber-800"
                }`}>{a.estado === "incompleto" ? "incompleto" : a.estado}</span>

                {a.componentes > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-auto">🧩 {a.componentes}</span>}
              </div>
            </div>
            );
          })}
        </div>

        {filtrados.length === 0 && <p className="text-center py-12 text-slate-400">No se encontraron activos.</p>}

        <Modal key={modal?.id_activo || "cerrado"} activo={modal} rol={rol} onClose={() => setModal(null)}
          onAgregarBolsa={agregarAlCarrito} onSolicitarYa={solicitarYa}
          enCarrito={!!modal && carrito.some(c => c.id_activo === modal.id_activo)}
          onChangeEstado={cambiarEstado} onChangeStock={cambiarStock} onChangeObs={cambiarObservaciones} categorias={categorias} />
      </div>
      <FabScanner />
      {showComprobar && <ComprobarModal activos={activos} onClose={() => { setShowComprobar(false); setModal(null); }} />}
    </div>
  );
}

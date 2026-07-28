"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import QRScanner from "@/components/QRScanner";


interface Activo {
  id_activo: string; nombre_activo: string; tipo: string; estado: string; categoria_nombre: string | null;
}

// ─── Same category colors as inventario ───
function catColor(nombre: string | null): string {
  if (!nombre) return "border-l-gray-300";
  const key = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const map: Record<string, string> = {
    "microcontroladores": "border-l-blue-400", "sensores": "border-l-emerald-400", "actuadores": "border-l-amber-400",
    "herramientas": "border-l-slate-400", "cables": "border-l-violet-400", "kits": "border-l-rose-400",
    "consumibles": "border-l-cyan-400", "raspberry": "border-l-pink-400", "arduino": "border-l-teal-400", "medicion": "border-l-indigo-400",
  };
  for (const [k, v] of Object.entries(map)) { if (key.includes(k)) return v; }
  const colors = ["border-l-blue-300","border-l-emerald-300","border-l-amber-300","border-l-violet-300","border-l-rose-300","border-l-cyan-300","border-l-teal-300","border-l-indigo-300"];
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
}

function NuevoPrestamoContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const [catalogo, setCatalogo] = useState<Activo[]>([]);
  const [carrito, setCarrito] = useState<{ activo: Activo; cantidad: number }[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState({
    fecha_limite: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    materia: "", profesor_encargado: "", curso_grupo: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetch("/api/inventario").then(r => r.json()).then(d => setCatalogo(d.filter((a: Activo) => a.estado === "disponible"))).catch(() => {});

    // Load scanned items from localStorage (from FabScanner in other pages)
    const stored = localStorage.getItem("scannedBag");
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      if (ids.length > 0) {
        const timer = setTimeout(() => {
          setCatalogo(prev => {
            prev.forEach(a => {
              if (ids.includes(a.id_activo) || ids.includes(a.codigo_qr || "")) {
                setCarrito(prevC => {
                  if (prevC.find(c => c.activo.id_activo === a.id_activo)) return prevC;
                  return [...prevC, { activo: a, cantidad: 1 }];
                });
              }
            });
            return prev;
          });
          localStorage.removeItem("scannedBag");
          toast.success("Items cargados desde escaneos anteriores");
        }, 600);
      }
    }
  }, []);

  useEffect(() => {
    const ids = sp.get("items");
    if (ids) {
      const idArr = ids.split(",");
      const t = setTimeout(async () => {
        const matched = catalogo.filter(a => idArr.includes(a.id_activo));
        const allItems: { activo: Activo; cantidad: number }[] = [];
        for (const m of matched) {
          if (!carrito.find(p => p.activo.id_activo === m.id_activo)) {
            allItems.push({ activo: m, cantidad: 1 });
          }
          // Fetch children for kits
          if (m.tipo === "trazable") {
            try {
              const res = await fetch(`/api/inventario/${m.id_activo}/children`);
              if (res.ok) {
                const children = await res.json();
                for (const ch of children) {
                  if (!carrito.find(p => p.activo.id_activo === ch.id_activo) && !allItems.find(p => p.activo.id_activo === ch.id_activo)) {
                    allItems.push({ activo: ch, cantidad: 1 });
                  }
                }
              }
            } catch {}
          }
        }
        if (allItems.length) setCarrito(prev => [...prev, ...allItems]);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [sp, catalogo]);

  const onScan = useCallback((code: string) => {
    const found = catalogo.find(a => a.codigo_qr === code || a.id_activo === code);
    if (found) {
      if (carrito.find(c => c.activo.id_activo === found.id_activo)) {
        toast.error("Ya está en la bolsa");
      } else {
        setCarrito(prev => [...prev, { activo: found, cantidad: 1 }]);
        toast.success(`${found.nombre_activo} escaneado`);
      }
    } else {
      toast.error("Activo no encontrado: " + code);
    }
  }, [catalogo, carrito]);

  async function agregar(a: Activo) {
    if (carrito.find(c => c.activo.id_activo === a.id_activo)) {
      toast.error("Ya está en la bolsa");
      return;
    }
    const nuevos: { activo: Activo; cantidad: number }[] = [{ activo: a, cantidad: 1 }];

    // If this is a kit (trazable, might have children), fetch and add children too
    if (a.tipo === "trazable") {
      try {
        const res = await fetch(`/api/inventario/${a.id_activo}/children`);
        if (res.ok) {
          const children = await res.json();
          for (const child of children) {
            if (!carrito.find(c => c.activo.id_activo === child.id_activo)) {
              nuevos.push({ activo: child, cantidad: 1 });
            }
          }
        }
      } catch {}
    }

    setCarrito(prev => [...prev, ...nuevos]);
    toast.success(nuevos.length > 1 ? `${a.nombre_activo} + ${nuevos.length - 1} componentes agregados` : `${a.nombre_activo} agregado`);
  }
  function quitar(id: string) { setCarrito(carrito.filter(c => c.activo.id_activo !== id)); }

  async function enviar() {
    if (!carrito.length) return toast.error("Agregá al menos un activo");
    if (!form.fecha_limite) return toast.error("Seleccioná una fecha límite");
    setEnviando(true);
    try {
      const res = await fetch("/api/prestamos", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: carrito.map(c => ({ id_activo: c.activo.id_activo, cantidad_entregada: c.cantidad })),
          fecha_limite: form.fecha_limite, materia: form.materia || null, profesor_encargado: form.profesor_encargado || null, curso_grupo: form.curso_grupo || null })});
      if (!res.ok) { const err = await res.json(); return toast.error(err.error || "Error"); }
      toast.success("Préstamo solicitado. Esperá la aprobación del monitor.");
      router.push("/prestamos");
    } catch { toast.error("Error de conexión"); }
    finally { setEnviando(false); }
  }

  const filtrados = catalogo.filter(a => !busqueda || a.nombre_activo.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6">
      {/* Scanner overlay */}
      {showScanner && (
        <QRScanner
          onScan={onScan}
          bagCount={carrito.length}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#09488D]">Nuevo Préstamo</h1>
            <p className="text-slate-400 text-sm mt-1">Seleccioná los materiales del laboratorio.</p>
          </div>
          <button onClick={() => setShowScanner(true)} className="btn-accent flex items-center gap-2 text-sm">
            📷 Escanear QR
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Bolsa + Form */}
          <div className="card-glass space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#09488D] text-lg">📦 Bolsa ({carrito.length})</h2>
            </div>
            {carrito.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                Seleccioná activos del catálogo o escaneá un QR.
              </div>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {carrito.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F4F6F9] rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700 truncate">{item.activo.nombre_activo}</span>
                    <button onClick={() => quitar(item.activo.id_activo)} className="text-rose-400 text-xs shrink-0 ml-2">Quitar</button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Fecha límite *</label><input type="date" value={form.fecha_limite} onChange={e => setForm({...form, fecha_limite: e.target.value})} className="input-glass" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Materia</label><input type="text" value={form.materia} onChange={e => setForm({...form, materia: e.target.value})} className="input-glass" placeholder="Ej: Física II" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Profesor</label><input type="text" value={form.profesor_encargado} onChange={e => setForm({...form, profesor_encargado: e.target.value})} className="input-glass" placeholder="Ej: Carlos López" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Curso / Grupo</label><input type="text" value={form.curso_grupo} onChange={e => setForm({...form, curso_grupo: e.target.value})} className="input-glass" placeholder="Ej: 2026-A" /></div>
            </div>
            <button onClick={enviar} disabled={enviando || carrito.length === 0} className="btn-primary w-full text-sm">{enviando ? "Solicitando..." : "Solicitar Préstamo"}</button>
            <button onClick={() => router.back()} className="btn-ghost w-full text-sm">Cancelar</button>
          </div>

          {/* RIGHT: Catálogo */}
          <div className="space-y-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar activo..." className="input-glass pl-10" />
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {filtrados.map(a => {
                const enCarrito = carrito.some(c => c.activo.id_activo === a.id_activo);
                const borderC = catColor(a.categoria_nombre);
                return (
                  <div key={a.id_activo} onClick={() => !enCarrito && agregar(a)}
                    className={`card-white flex items-center justify-between cursor-pointer border-l-[3px] ${borderC} ${
                      enCarrito ? "border-l-amber-400 bg-amber-50/60" : ""
                    }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={a.tipo === "trazable" ? "pill-primary" : "pill-accent"}>{a.tipo === "trazable" ? "QR" : "Stock"}</span>
                        <span className="text-[10px] text-slate-400">{a.categoria_nombre || "—"}</span>
                      </div>
                      <p className="font-semibold text-[#09488D] text-sm mt-1">{a.nombre_activo}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.15)] ${
                      enCarrito ? "bg-[#F7C800]" : "bg-emerald-400"
                    }`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NuevoPrestamoPage() {
  return <Suspense fallback={<div className="p-8 text-center text-[#09488D]">Cargando...</div>}><NuevoPrestamoContent /></Suspense>;
}
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

interface Activo {
  id_activo: string; nombre_activo: string; tipo: string; estado: string; categoria_nombre: string | null;
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

  useEffect(() => {
    fetch("/api/inventario").then(r => r.json()).then(d => setCatalogo(d.filter((a: Activo) => a.estado === "disponible"))).catch(() => {});
  }, []);

  useEffect(() => {
    const ids = sp.get("items");
    if (ids) {
      const idArr = ids.split(",");
      const t = setTimeout(() => {
        const matched = catalogo.filter(a => idArr.includes(a.id_activo));
        if (matched.length) setCarrito(prev => [...prev, ...matched.filter(m => !prev.find(p => p.activo.id_activo === m.id_activo)).map(a => ({ activo: a, cantidad: 1 }))]);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [sp, catalogo]);

  function agregar(a: Activo) {
    if (carrito.find(c => c.activo.id_activo === a.id_activo)) return toast.error("Ya está en la bolsa");
    setCarrito([...carrito, { activo: a, cantidad: 1 }]);
  }
  function quitar(id: string) { setCarrito(carrito.filter(c => c.activo.id_activo !== id)); }

  async function enviar() {
    if (!carrito.length) return toast.error("Agregá al menos un activo");
    if (!form.fecha_limite) return toast.error("Seleccioná una fecha límite");
    setEnviando(true);
    try {
      const res = await fetch("/api/prestamos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: carrito.map(c => ({ id_activo: c.activo.id_activo, cantidad_entregada: c.cantidad })),
          fecha_limite: form.fecha_limite, materia: form.materia || null,
          profesor_encargado: form.profesor_encargado || null, curso_grupo: form.curso_grupo || null,
        }),
      });
      if (!res.ok) { const err = await res.json(); return toast.error(err.error || "Error"); }
      toast.success("Préstamo solicitado. Esperá la aprobación del monitor.");
      router.push("/prestamos");
    } catch { toast.error("Error de conexión"); }
    finally { setEnviando(false); }
  }

  const filtrados = catalogo.filter(a => !busqueda || a.nombre_activo.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#09488D]">Nuevo Préstamo</h1>
          <p className="text-gray-400 text-sm mt-1">Seleccioná los materiales que necesitás del laboratorio.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Bolsa + Form */}
          <div className="card-glass space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#09488D] text-lg">📦 Bolsa ({carrito.length})</h2>
            </div>

            {carrito.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
                Seleccioná activos del catálogo para agregarlos a tu bolsa.
              </div>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {carrito.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F4F6F9] rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-gray-700 truncate">{item.activo.nombre_activo}</span>
                    <button onClick={() => quitar(item.activo.id_activo)} className="text-red-400 text-xs shrink-0 ml-2">Quitar</button>
                  </div>
                ))}
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha límite *</label>
                <input type="date" value={form.fecha_limite} onChange={e => setForm({...form, fecha_limite: e.target.value})}
                  className="input-glass" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Materia</label>
                <input type="text" value={form.materia} onChange={e => setForm({...form, materia: e.target.value})}
                  className="input-glass" placeholder="Ej: Física II" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Profesor</label>
                <input type="text" value={form.profesor_encargado} onChange={e => setForm({...form, profesor_encargado: e.target.value})}
                  className="input-glass" placeholder="Ej: Carlos López" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Curso / Grupo</label>
                <input type="text" value={form.curso_grupo} onChange={e => setForm({...form, curso_grupo: e.target.value})}
                  className="input-glass" placeholder="Ej: 2026-A" />
              </div>
            </div>

            <button onClick={enviar} disabled={enviando || carrito.length === 0} className="btn-primary w-full text-sm">
              {enviando ? "Solicitando..." : "Solicitar Préstamo"}
            </button>
            <button onClick={() => router.back()} className="btn-ghost w-full text-sm">Cancelar</button>
          </div>

          {/* RIGHT: Catálogo */}
          <div className="space-y-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
              </svg>
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar activo..." className="input-glass pl-10" />
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {filtrados.map(a => {
                const enCarrito = carrito.some(c => c.activo.id_activo === a.id_activo);
                const isQR = a.tipo === "trazable";
                return (
                  <div key={a.id_activo}
                    onClick={() => !enCarrito && agregar(a)}
                    className={`card-white flex items-center justify-between cursor-pointer hover:border-[#09488D]/20 ${
                      enCarrito ? "border-[#F7C800]/40 bg-[#F7C800]/5" : ""
                    }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs pill-primary">{isQR ? "QR" : "Stock"}</span>
                        <span className="text-[10px] text-gray-400">{a.categoria_nombre || "—"}</span>
                      </div>
                      <p className="font-semibold text-[#09488D] text-sm mt-1">{a.nombre_activo}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.15)] ${
                      enCarrito ? "bg-[#F7C800]" : a.estado === "disponible" ? "bg-green-400" : "bg-red-400"
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
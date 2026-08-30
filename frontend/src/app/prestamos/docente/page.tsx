"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QRScanner from "@/components/QRScanner";

interface Activo {
  id_activo: string; nombre_activo: string; codigo_qr: string | null; tipo: string; estado: string;
  nombre_categoria: string | null; nombre_area: string | null; componentes: number;
  id_activo_padre: string | null;
}

export default function PrestamoDocentePage() {
  const router = useRouter();
  const [catalogo, setCatalogo] = useState<Activo[]>([]);
  const [carrito, setCarrito] = useState<{ activo: Activo; cantidad: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroArea, setFiltroArea] = useState("todas");
  const [areas, setAreas] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);

  const [nombreDocente, setNombreDocente] = useState("");
  const [materia, setMateria] = useState("");
  const [profesor, setProfesor] = useState("");
  const [cursoGrupo, setCursoGrupo] = useState("");
  const [fechaLimite, setFechaLimite] = useState(() => {
    const d = new Date(Date.now() + 8 * 86400000);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/inventario").then(r => r.json()),
      fetch("/api/areas").then(r => r.json()),
    ]).then(([inv, areasData]) => {
      // Filter: only disponibles/incompleto, no id_activo_padre (not children)
      const disponibles = inv.filter((a: Activo) => (a.estado === "disponible" || a.estado === "incompleto") && !a.id_activo_padre);
      setCatalogo(disponibles);
      setAreas(areasData);

      // Cargar escaneos previos (FabScanner de inventario) — SOLO con catálogo listo
      try {
        const stored = localStorage.getItem("scannedBag");
        if (stored) {
          const codes = JSON.parse(stored) as string[];
          if (codes.length > 0) {
            const agregados: string[] = [];
            disponibles.forEach((a: Activo) => {
              const cqr = (a.codigo_qr || "").toLowerCase().trim();
              const match = codes.find(c => {
                const sc = c.toLowerCase().trim();
                return cqr === sc || a.id_activo === sc;
              });
              if (match && !agregados.includes(a.id_activo)) {
                agregados.push(a.id_activo);
                setCarrito(prevC => prevC.find(p => p.activo.id_activo === a.id_activo) ? prevC : [...prevC, { activo: a, cantidad: 1 }]);
              }
            });
            localStorage.removeItem("scannedBag");
            if (agregados.length > 0) {
              toast.success(`Escaneados: ${agregados.length} activos en la bolsa`);
            }
          }
        }
      } catch {}
    }).catch(() => toast.error("Error al cargar")).finally(() => setLoading(false));

    // Escaneo en vivo mientras se está en esta página
    const handleScan = () => {
      const stored = localStorage.getItem("scannedBag");
      if (!stored) return;
      const codes = JSON.parse(stored) as string[];
      localStorage.removeItem("scannedBag");
      if (codes.length === 0) return;
      setCatalogo(prev => {
        codes.forEach(code => {
          const sc = code.toLowerCase().trim();
          const match = prev.find(c => {
            const cqr = (c.codigo_qr || "").toLowerCase().trim();
            return cqr === sc || c.id_activo === sc;
          });
          if (match) {
            setCarrito(prevC => {
              if (prevC.find(p => p.activo.id_activo === match.id_activo)) return prevC;
              return [...prevC, { activo: match, cantidad: 1 }];
            });
          }
        });
        return prev;
      });
    };
    window.addEventListener("scannedItemsChanged", handleScan);
    return () => window.removeEventListener("scannedItemsChanged", handleScan);
  }, []);

  const onScan = useCallback((code: string) => {
    const sc = code.toLowerCase().trim();
    setCatalogo(prev => {
      const found = prev.find(c => {
        const cqr = (c.codigo_qr || "").toLowerCase().trim();
        return cqr === sc || c.id_activo === sc;
      });
      if (found) {
        setCarrito(prevC => {
          if (prevC.find(p => p.activo.id_activo === found.id_activo)) {
            toast.error("Ya está en la bolsa");
            return prevC;
          }
          toast.success(found.nombre_activo + " escaneado");
          return [...prevC, { activo: found, cantidad: 1 }];
        });
      } else {
        toast.error("Activo no encontrado: " + code);
      }
      return prev;
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreDocente.trim()) return toast.error("Nombre del docente obligatorio");
    if (carrito.length === 0) return toast.error("Agregá al menos un activo");
    setSaving(true);
    try {
      const res = await fetch("/api/prestamos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_docente: nombreDocente.trim(),
          materia: materia || null,
          profesor_encargado: profesor || null,
          curso_grupo: cursoGrupo || null,
          fecha_limite: fechaLimite,
          items: carrito.map(c => ({ id_activo: c.activo.id_activo, cantidad: c.cantidad })),
        }),
      });
      if (res.ok) {
        toast.success("Préstamo registrado correctamente");
        router.push("/prestamos");
      } else {
        const e = await res.json();
        toast.error(e.error || "Error al crear préstamo");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); }
  }

  function agregar(a: Activo) {
    if (carrito.find(c => c.activo.id_activo === a.id_activo)) { toast.error("Ya está en la bolsa"); return; }
    setCarrito(prev => [...prev, { activo: a, cantidad: 1 }]);
  }
  function quitar(id: string) { setCarrito(prev => prev.filter(c => c.activo.id_activo !== id)); }

  const disponibles = catalogo.filter(a => {
    if (filtroArea !== "todas" && a.nombre_area !== filtroArea) return false;
    return !busqueda || a.nombre_activo.toLowerCase().includes(busqueda.toLowerCase());
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]"><div className="w-8 h-8 border-2 border-[#09488D] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      {/* Scanner overlay */}
      {showScanner && (
        <QRScanner onScan={onScan} bagCount={carrito.length} onClose={() => setShowScanner(false)} showBagLink={false} />
      )}

      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[#09488D] flex items-center gap-2">
                Préstamo a Docente
                <span className="text-sm font-normal text-slate-400">— Monitor como garante</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">El monitor registra el préstamo. El docente no necesita cuenta.</p>
            </div>
            <button onClick={() => setShowScanner(true)} className="btn-accent flex items-center gap-2 text-sm">
              📷 Escanear QR
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="card-glass space-y-4">
            <h2 className="font-bold text-[#09488D]">📋 Datos del préstamo</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del docente *</label>
              <input type="text" value={nombreDocente} onChange={e => setNombreDocente(e.target.value)}
                placeholder="Ej: Juan Pérez" className="input-glass w-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha límite de devolución *</label>
                <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Materia / Proyecto *</label>
                <input type="text" value={materia} onChange={e => setMateria(e.target.value)}
                  placeholder="Ej: Sistemas Embebidos" className="input-glass w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Digita nuevamente al profesor *</label>
                <input type="text" value={profesor} onChange={e => setProfesor(e.target.value)}
                  placeholder="Ej: Carlos López" className="input-glass w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1"> tipo de vinculación *</label>
                <input type="text" value={cursoGrupo} onChange={e => setCursoGrupo(e.target.value)}
                  placeholder="Ej: catedrático " className="input-glass w-full" />
              </div>
            </div>
            <button type="submit" disabled={saving || carrito.length === 0}
              className="btn-primary w-full text-sm">
              {saving ? "Registrando..." : `Registrar préstamo para ${nombreDocente || "docente"} (${carrito.length} items)`}
            </button>
          </form>

          <div className="card-glass space-y-2">
            <h3 className="font-bold text-[#09488D] text-sm">🛒 Bolsa ({carrito.length})</h3>
            {carrito.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Agregá activos desde el catálogo o escaneá QR.</p>
            ) : (
              carrito.map(c => (
                <div key={c.activo.id_activo} className="flex items-center justify-between bg-[#F4F6F9] rounded-lg p-2 text-sm">
                  <span className="text-slate-700 truncate">{c.activo.nombre_activo}</span>
                  <button onClick={() => quitar(c.activo.id_activo)} className="text-rose-400 hover:text-rose-600 text-xs ml-2">✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-3">
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar activo..." className="input-glass w-full" />

          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setFiltroArea("todas")} className={filtroArea === "todas" ? "chip chip-active" : "chip"}>Todas</button>
            {areas.map((a: any) => (
              <button key={a.nombre_area} onClick={() => setFiltroArea(a.nombre_area)}
                className={filtroArea === a.nombre_area ? "chip chip-active" : "chip"}>
                {a.nombre_area}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {disponibles.map(a => (
              <div key={a.id_activo} onClick={() => agregar(a)}
                className={`card-white cursor-pointer hover:-translate-y-0.5 ${
                  carrito.some(c => c.activo.id_activo === a.id_activo)
                    ? "bg-emerald-50 border-emerald-200"
                    : ""
                }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">
                      {a.nombre_area || ""}{a.nombre_categoria ? " · " + a.nombre_categoria : ""}
                    </span>
                    <h3 className="font-semibold text-[#09488D] text-sm mt-0.5">{a.nombre_activo}</h3>
                  </div>
                  {carrito.some(c => c.activo.id_activo === a.id_activo) && <span className="text-emerald-500">✓</span>}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="pill-primary text-xs">{a.tipo === "trazable" ? "Trazable" : "Consumible"}</span>
                  {a.componentes > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">🧩 {a.componentes}</span>}
                </div>
              </div>
            ))}
            {disponibles.length === 0 && <p className="text-slate-400 text-sm col-span-2 text-center py-8">No hay activos disponibles.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
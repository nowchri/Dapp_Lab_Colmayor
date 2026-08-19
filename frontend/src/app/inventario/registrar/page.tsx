"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QRCode from "qrcode";

interface Categoria { id_categoria: string; nombre_categoria: string; }
interface ChildItem { nombre: string; qr?: string; }

export default function RegistrarActivoPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrText, setQrText] = useState("");
  const [isKit, setIsKit] = useState(false);
  const [children, setChildren] = useState<ChildItem[]>([]);

  const [form, setForm] = useState({
    nombre_activo: "", tipo: "trazable" as string, codigo_qr: "",
    id_categoria: "", id_activo_padre: "", observaciones_iniciales: "", stock_actual: 0,
  });

  const [areas, setAreas] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState("");

  useEffect(() => {
    fetch("/api/categorias").then(r => r.json()).then(setCategorias).catch(() => {});
    fetch("/api/areas").then(r => r.json()).then(setAreas).catch(() => {});
    
  }, []);

  // Detect if selected category is "kits" (case-insensitive)
  const selectedCat = categorias.find(c => c.id_categoria === form.id_categoria);
  const esKit = !!selectedCat && selectedCat.nombre_categoria.toLowerCase().includes("kit");

  async function generarQR() {
    const nombre = form.nombre_activo.trim();
    if (!nombre) return toast.error("Primero escribe el nombre del activo");
    const base = nombre.toUpperCase().replace(/\s+/g, "-").slice(0, 30);
    const ts = Date.now().toString(36).toUpperCase();
    const qr = "QR-" + base + "-" + ts;
    try {
      const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
      setQrDataUrl(dataUrl); setQrText(qr); setForm({ ...form, codigo_qr: qr });
      toast.success("QR generado");
    } catch { toast.error("No se pudo generar el QR"); }
  }

  function downloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl; a.download = qrText.replace(/[^a-zA-Z0-9]/g, "_") + ".png"; a.click();
  }

  function addChild() { setChildren([...children, { nombre: "" }]); }
  function removeChild(i: number) { setChildren(children.filter((_, idx) => idx !== i)); }
  function updateChild(i: number, field: keyof ChildItem, value: string) {
    const updated = [...children];
    updated[i] = { ...updated[i], [field]: value };
    setChildren(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre_activo.trim()) return toast.error("Nombre obligatorio");
    setLoading(true);

    try {
      let qr = form.codigo_qr;
      if (form.tipo === "trazable" && !qr) {
        qr = "QR-" + form.nombre_activo.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 30) + "-" + Date.now().toString(36).toUpperCase();
      }

      // 1. Create parent kit
      const parentRes = await fetch("/api/inventario", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_activo: form.nombre_activo.trim(), codigo_qr: qr,
          id_categoria: form.id_categoria || null, id_activo_padre: form.id_activo_padre || null,
          tipo: form.tipo, observaciones_iniciales: form.observaciones_iniciales || null, stock_actual: form.tipo === "consumible" ? form.stock_actual : 0,
        }),
      });
      if (!parentRes.ok) {
        const err = await parentRes.json();
        return toast.error(err.error || "Error al registrar");
      }
      const parent = await parentRes.json();
      const parentId = parent.id_activo;

      // 2. Create children if kit
      let childCount = 0;
      for (const child of children) {
        if (!child.nombre.trim()) continue;
        await fetch("/api/inventario", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre_activo: child.nombre.trim(), codigo_qr: null,
            id_categoria: null, id_activo_padre: parentId,
            tipo: "trazable", observaciones_iniciales: null,
          }),
        });
        childCount++;
      }

      toast.success(childCount > 0 ? `Kit creado con ${childCount} componentes` : "Activo registrado");
      router.push("/inventario");
    } catch { toast.error("Error de conexion"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-[#09488D] mb-6">Registrar Nuevo Activo</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre del activo *</label>
            <input type="text" value={form.nombre_activo} onChange={e => setForm({ ...form, nombre_activo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#09488D] outline-none"
              placeholder={esKit ? "Ej: Kit Arduino Básico" : "Ej: Arduino Uno R3"} />
          </div>

          {/* Tipo + Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none">
                <option value="trazable">Trazable (QR individual)</option>
                <option value="consumible">Consumible (Stock)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Area</label>
              <select
                value={selectedAreaId}
                onChange={e => {
                  setSelectedAreaId(e.target.value);
                  setForm({ ...form, id_categoria: "" });
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none">
                <option value="">Seleccioná un area</option>
                {areas.map((a: any) => (
                  <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Categoria</label>
              <select value={form.id_categoria} onChange={e => setForm({ ...form, id_categoria: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none">
                <option value="">Sin categoria</option>
                {categorias
                .filter((c: any) => !selectedAreaId || c.id_area === selectedAreaId)
                .map((c: any) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre_categoria}
                  </option>
                ))}
              </select>
            </div>
          </div>



          {/* Stock input — solo consumibles */}
          {form.tipo === "consumible" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Stock disponible *</label>
              <input
                type="number" min="0"
                value={form.stock_actual || ""}
                onChange={e => setForm({ ...form, stock_actual: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#09488D]"
                placeholder="Ej: 50"
              />
            </div>
          )}

          {/* QR Section — solo trazables */}
          {form.tipo !== "consumible" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Codigo QR {form.tipo === "consumible" && "(no aplica)"}</label>
              <div className="flex gap-3 mb-3">
                <input type="text" value={form.codigo_qr} readOnly
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl outline-none font-mono text-sm bg-gray-50"
                  placeholder="Auto-generado al pulsar el boton" />
                <button type="button" onClick={generarQR} disabled={form.tipo === "consumible"}
                  className="btn-primary text-sm whitespace-nowrap px-4">Generar QR</button>
              </div>
              {qrDataUrl && (
                <div className="flex flex-col sm:flex-row items-start gap-3 p-4 bg-[#F4F6F9] rounded-xl border border-gray-200">
                  <div className="bg-white p-2 rounded-lg border-2 border-[#09488D]/20 shadow-sm shrink-0">
                    <img src={qrDataUrl} alt="QR" className="w-28 h-28 sm:w-36 sm:h-36 object-contain" />
                  </div>
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <p className="font-mono text-xs text-slate-500 break-all bg-white rounded-lg p-2 border">{qrText}</p>
                    <button type="button" onClick={downloadQR}
                      className="flex items-center gap-2 px-3 py-2 bg-[#09488D] text-white rounded-lg hover:bg-[#073a6b] transition text-sm w-fit">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      Descargar QR
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMPONENTES DEL KIT — shows when categoria is "kits" */}
          {esKit && (
            <div className="space-y-3 bg-amber-50/50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-amber-700 text-sm">🧩 Componentes del kit</h3>
                <button type="button" onClick={addChild}
                  className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition font-medium">
                  + Agregar componente
                </button>
              </div>
              <p className="text-xs text-amber-600">Agregá cada pieza que compone este kit. Se añadirán a la lista de componentes de este kit.</p>
              <p className="text-xs text-rose-500 font-medium mt-1">⚠️ Importante: Una vez registrado, no se podrán añadir ni eliminar componentes del kit. Verificá bien antes de guardar.</p>
              {children.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-amber-300 rounded-lg">
                  No hay componentes todavía. Clic en "Agregar componente".
                </p>
              )}
              {children.map((child, i) => (
                <div key={i} className="flex gap-2 items-start bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex-1">
                    <input type="text" value={child.nombre} onChange={e => updateChild(i, "nombre", e.target.value)}
                      placeholder="Nombre del componente (ej: Cable USB)"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#09488D]" />
                    <p className="text-[10px] text-slate-400 mt-1">Sin QR — solo visible dentro de este kit</p>
                  </div>
                  <button type="button" onClick={() => removeChild(i)}
                    className="text-rose-400 hover:text-rose-600 text-sm mt-1 shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Observaciones iniciales</label>
            <textarea value={form.observaciones_iniciales} onChange={e => setForm({ ...form, observaciones_iniciales: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none resize-none h-20"
              placeholder="Notas sobre el estado inicial..." />
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Guardando..." : esKit && children.length > 0 ? `Registrar Kit (+${children.length})` : "Registrar Activo"}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-ghost">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
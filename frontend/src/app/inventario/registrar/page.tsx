"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QRCode from "qrcode";

interface Categoria {
  id_categoria: string;
  nombre_categoria: string;
}

interface Activo {
  id_activo: string;
  nombre_activo: string;
  tipo: string;
}

export default function RegistrarActivoPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [activosPadre, setActivosPadre] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrText, setQrText] = useState("");

  const [form, setForm] = useState({
    nombre_activo: "",
    tipo: "trazable" as string,
    codigo_qr: "",
    id_categoria: "",
    id_activo_padre: "",
    observaciones_iniciales: "",
  });

  useEffect(() => {
    fetch("/api/categorias").then(r => r.json()).then(setCategorias).catch(() => {});
    fetch("/api/inventario").then(r => r.json()).then((data: Activo[]) =>
      setActivosPadre(data.filter((a: Activo) => a.tipo === "trazable"))
    ).catch(() => {});
  }, []);

  async function generarQR() {
    const nombre = form.nombre_activo.trim();
    if (!nombre) return toast.error("Primero escribe el nombre del activo");

    const base = nombre.toUpperCase().replace(/\s+/g, "-").slice(0, 30);
    const ts = Date.now().toString(36).toUpperCase();
    const qr = "QR-" + base + "-" + ts;

    try {
      const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
      setQrDataUrl(dataUrl);
      setQrText(qr);
      setForm({ ...form, codigo_qr: qr });
      toast.success("QR generado");
    } catch {
      toast.error("No se pudo generar el QR");
    }
  }

  function downloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = qrText.replace(/[^a-zA-Z0-9]/g, "_") + ".png";
    a.click();
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

      const res = await fetch("/api/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_activo: form.nombre_activo.trim(),
          codigo_qr: qr,
          id_categoria: form.id_categoria || null,
          id_activo_padre: form.id_activo_padre || null,
          tipo: form.tipo,
          observaciones_iniciales: form.observaciones_iniciales || null,
        }),
      });

      if (res.ok) {
        toast.success("Activo registrado");
        router.push("/inventario");
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al registrar");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-iu-light p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-iu-primary mb-6">Registrar Nuevo Activo</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-iu-dark mb-1">Nombre del activo *</label>
            <input
              type="text"
              value={form.nombre_activo}
              onChange={e => setForm({ ...form, nombre_activo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-iu-primary outline-none"
              placeholder="Ej: Arduino Uno R3"
            />
          </div>

          {/* Tipo + Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-iu-dark mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none">
                <option value="trazable">Trazable (QR individual)</option>
                <option value="consumible">Consumible (Stock)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-iu-dark mb-1">Categoria</label>
              <select value={form.id_categoria} onChange={e => setForm({ ...form, id_categoria: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none">
                <option value="">Sin categoria</option>
                {categorias.map((c: Categoria) => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kit padre */}
          <div>
            <label className="block text-sm font-medium text-iu-dark mb-1">Kit padre (opcional)</label>
            <select value={form.id_activo_padre} onChange={e => setForm({ ...form, id_activo_padre: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none">
              <option value="">Activo independiente</option>
              {activosPadre.map((a: any) => (
                <option key={a.id_activo} value={a.id_activo}>{a.nombre_activo}</option>
              ))}
            </select>
          </div>

          {/* QR Section */}
          <div>
            <label className="block text-sm font-medium text-iu-dark mb-1">
              Codigo QR {form.tipo === "consumible" && "(no aplica)"}
            </label>

            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={form.codigo_qr}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl outline-none font-mono text-sm bg-gray-50"
                placeholder="Auto-generado al pulsar el boton"
              />
              <button
                type="button"
                onClick={generarQR}
                disabled={form.tipo === "consumible"}
                className="btn-primary text-sm whitespace-nowrap px-4"
              >
                Generar QR
              </button>
            </div>

            {/* QR Preview */}
            {qrDataUrl && (
              <div className="flex items-start gap-4 p-4 bg-iu-light rounded-xl border border-gray-200">
                <div className="bg-white p-2 rounded-lg border-2 border-iu-primary/20 shadow-sm shrink-0">
                  <img
                    src={qrDataUrl}
                    alt="QR generado"
                    className="w-36 h-36 object-contain"
                  />
                </div>

                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <p className="font-mono text-xs text-iu-gray break-all bg-white rounded-lg p-2 border">
                    {qrText}
                  </p>
                  <button
                    type="button"
                    onClick={downloadQR}
                    className="flex items-center gap-2 px-3 py-2 bg-iu-primary text-white rounded-lg hover:bg-iu-primary/90 transition text-sm w-fit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    Descargar QR
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-iu-dark mb-1">Observaciones iniciales</label>
            <textarea
              value={form.observaciones_iniciales}
              onChange={e => setForm({ ...form, observaciones_iniciales: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none resize-none h-20"
              placeholder="Notas sobre el estado inicial, componentes incluidos..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Guardando..." : "Registrar Activo"}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
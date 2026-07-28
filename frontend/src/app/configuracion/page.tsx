"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ConfiguracionPage() {
  const [bloqueoMora, setBloqueoMora] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion")
      .then((r) => r.json())
      .then((data) => {
        setBloqueoMora(data.bloqueo_por_mora === "true");
      })
      .catch(() => toast.error("No se pudo cargar la configuración"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleMora() {
    setSaving(true);
    const nuevo = !bloqueoMora;
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bloqueo_por_mora: String(nuevo) }),
      });
      if (res.ok) {
        setBloqueoMora(nuevo);
        toast.success(nuevo ? "Bloqueo por mora ACTIVADO" : "Bloqueo por mora DESACTIVADO");
      } else {
        toast.error("Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-iu-gray">Cargando...</div>;

  return (
    <div className="min-h-screen bg-iu-light p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-iu-primary">⚙️ Configuración del Sistema</h1>

        {/* Bloqueo por mora */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-iu-dark text-lg">Bloqueo por mora (D1)</h2>
              <p className="text-sm text-iu-gray mt-1">
                Cuando está activo, los estudiantes con préstamos vencidos (8 días de gracia) no pueden solicitar nuevos préstamos.
                La validación es Just-in-Time al momento de crear el préstamo.
              </p>
            </div>
            <button
              onClick={toggleMora}
              disabled={saving}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition shrink-0 mt-1 ${
                bloqueoMora ? "bg-iu-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  bloqueoMora ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${bloqueoMora ? "bg-green-500" : "bg-gray-400"}`} />
            <span className={bloqueoMora ? "text-green-700" : "text-gray-500"}>
              {bloqueoMora ? "Bloqueo activo — los estudiantes en mora no pueden pedir préstamos" : "Bloqueo inactivo — todos pueden pedir préstamos sin restricción"}
            </span>
          </div>
        </div>

        {/* Información del sistema */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-iu-dark text-lg">Información del contrato</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-iu-gray">Red</span>
              <span className="font-mono text-iu-dark">Polygon Amoy Testnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-iu-gray">Contrato</span>
              <span className="font-mono text-iu-dark text-xs">0x8f8ed9B2b92d068318eCA95BB31201d1C2B962c6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-iu-gray">Wallet servidor</span>
              <span className="font-mono text-iu-dark text-xs">0x5d0A0f056f222D3EDa3866d5977AC99B55C20baF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
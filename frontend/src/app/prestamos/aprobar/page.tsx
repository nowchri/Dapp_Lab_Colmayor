"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Prestamo {
  id_prestamo: string;
  estudiante_nombre: string;
  estado_general: string;
  materia: string | null;
  fecha_limite: string;
}

export default function AprobarPage() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/prestamos")
      .then((r) => r.json())
      .then((data) => setPendientes((data as Prestamo[]).filter((p: any) => p.estado_general === "pendiente")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function aprobar(id: string) {
    try {
      const res = await fetch(`/api/prestamos/${id}/aprobar`, { method: "POST" });
      if (res.ok) {
        toast.success("Préstamo aprobado ✅");
        setPendientes(pendientes.filter((p) => p.id_prestamo !== id));
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al aprobar");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }

  if (loading) return <div className="p-8 text-center text-iu-gray">Cargando...</div>;

  return (
    <div className="min-h-screen bg-iu-light p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-iu-primary mb-6">✅ Aprobar Préstamos</h1>

        {pendientes.length === 0 ? (
          <div className="text-center py-12 text-iu-gray">
            <p className="text-4xl mb-4">📭</p>
            <p>No hay préstamos pendientes de aprobación.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendientes.map((p: any) => (
              <div key={p.id_prestamo} className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-iu-dark">{p.estudiante_nombre}</p>
                  <p className="text-sm text-iu-gray">
                    {p.materia || "Sin materia"} · Límite: {new Date(p.fecha_limite).toLocaleDateString("es-CO")}
                  </p>
                  <p className="text-xs text-iu-gray font-mono">#{p.id_prestamo.slice(0, 8)}</p>
                </div>
                <button onClick={() => aprobar(p.id_prestamo)} className="btn-primary text-sm">
                  Aprobar
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => router.back()} className="btn-ghost mt-6 text-sm">
          ← Volver
        </button>
      </div>
    </div>
  );
}
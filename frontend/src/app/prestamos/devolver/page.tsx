"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Detalle {
  id_detalle: string;
  activo_nombre: string;
  activo_tipo: string;
  cantidad_entregada: number;
  esta_devuelto: boolean;
}

export default function DevolverPage() {
  const router = useRouter();
  const [activos, setActivos] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState("");
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [devueltos, setDevueltos] = useState<Set<string>>(new Set());
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    fetch("/api/prestamos")
      .then((r) => r.json())
      .then((data) => setActivos(data.filter((p: any) => p.estado_general === "activo")))
      .catch(console.error);
  }, []);

  async function seleccionarPrestamo(id: string) {
    setSeleccionado(id);
    try {
      const res = await fetch(`/api/prestamos/${id}/detalles`);
      if (res.ok) {
        const data = await res.json();
        setDetalles(data);
        setDevueltos(new Set<string>());
      }
    } catch { toast.error("Error al cargar detalles"); }
  }

  function toggleDevuelto(id: string) {
    const nuevo = new Set(devueltos);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    setDevueltos(nuevo);
  }

  async function confirmarDevolucion() {
    if (!seleccionado) return;
    const items = detalles.map((d) => ({
      id_detalle: d.id_detalle,
      observacion: devueltos.has(d.id_detalle) ? observacion : undefined,
    }));
    try {
      const res = await fetch(`/api/prestamos/${seleccionado}/devolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items_devueltos: items }),
      });
      if (res.ok) {
        toast.success("Devolución registrada");
        router.push("/prestamos");
      } else {
        const err = await res.json();
        toast.error(err.error || "Error");
      }
    } catch { toast.error("Error de conexión"); }
  }

  return (
    <div className="min-h-screen bg-iu-light p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-iu-primary mb-6">🔄 Registrar Devolución</h1>

        {!seleccionado ? (
          <div className="space-y-3">
            <p className="text-iu-gray">Seleccioná un préstamo activo:</p>
            {activos.length === 0 ? (
              <p className="text-center text-iu-gray py-8">No hay préstamos activos.</p>
            ) : (
              activos.map((p: any) => (
                <div key={p.id_prestamo}
                  onClick={() => seleccionarPrestamo(p.id_prestamo)}
                  className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition">
                  <p className="font-semibold">{p.estudiante_nombre}</p>
                  <p className="text-sm text-iu-gray">{p.materia || "Sin materia"} · #{p.id_prestamo.slice(0, 8)}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-bold text-iu-dark">Items a devolver</h2>
            {detalles.map((d) => (
              <div key={d.id_detalle} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-medium text-sm">{d.activo_nombre}</p>
                  <p className="text-xs text-iu-gray">{d.activo_tipo} · {d.cantidad_entregada} ud.</p>
                </div>
                <button
                  onClick={() => toggleDevuelto(d.id_detalle)}
                  className={"w-8 h-8 rounded-full flex items-center justify-center " +
                    (devueltos.has(d.id_detalle) ? "bg-green-500 text-white" : "bg-gray-200")}
                >
                  {devueltos.has(d.id_detalle) ? "V" : ""}
                </button>
              </div>
            ))}

            <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm h-20"
              placeholder="Observaciones (opcional)" />

            <button onClick={confirmarDevolucion} className="btn-primary w-full text-sm">
              Confirmar Devolución
            </button>
            <button onClick={() => setSeleccionado("")} className="btn-ghost w-full text-sm">
              Seleccionar otro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

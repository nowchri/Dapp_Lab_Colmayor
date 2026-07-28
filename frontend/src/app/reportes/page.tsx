"use client";

import { useEffect, useState } from "react";

interface ReporteItem {
  id_prestamo: string;
  estudiante_nombre: string;
  estudiante_correo: string | null;
  fecha_limite: string;
  nombre_completo: string;
  monitor_nombre: string | null;
  album_activo: boolean;
  estado_general: string;
  fecha_inicio: string;
  materia: string | null;
}

export default function ReportesPage() {
  const [prestamos, setPrestamos] = useState<ReporteItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar todos los préstamos (admin ve todo)
    fetch("/api/prestamos")
      .then((r) => r.json())
      .then(setPrestamos)
      .catch(console.error)
      .finally(() => setLoading(false));

    // Cargar stats
    fetch("/api/reports/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const vencidos = prestamos.filter((p: any) => {
    if (p.estado_general !== "activo" && p.estado_general !== "mora") return false;
    const limite = new Date(p.fecha_limite);
    limite.setDate(limite.getDate() + 8);
    return new Date() > limite;
  });

  if (loading) return <div className="p-8 text-center text-iu-gray">Cargando...</div>;

  return (
    <div className="min-h-screen bg-iu-light p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-iu-primary">📊 Reportes y Auditoría</h1>

        {/* Stats dashboard (RF-20) */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Activos" value={stats.total_activos} color="iu-primary" />
            <StatCard label="Disponibles" value={stats.disponibles} color="green" />
            <StatCard label="Préstamos Activos" value={stats.prestamos_activos} color="iu-primary" />
            <StatCard label="En Mora" value={stats.en_mora} color="red" />
          </div>
        )}

        {/* Panel de Sanciones (RF-17) — estudiantes que superaron gracia */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-iu-dark text-lg mb-1">🚨 Panel de Sanciones</h2>
          <p className="text-sm text-iu-gray mb-4">
            Estudiantes con préstamos activos que superaron el plazo + 8 días de gracia (Regla 4)
          </p>

          {vencidos.length === 0 ? (
            <div className="text-center py-6 text-iu-gray text-sm">No hay estudiantes en mora.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-iu-gray border-b">
                    <th className="py-2">Estudiante</th>
                    <th className="py-2">Material</th>
                    <th className="py-2">Materia</th>
                    <th className="py-2">Profesor</th>
                    <th className="py-2">Venció</th>
                    <th className="py-2">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {vencidos.map((p: any) => {
                    const limite = new Date(p.fecha_limite);
                    limite.setDate(limite.getDate() + 8);
                    const diasExtra = Math.ceil(
                      (Date.now() - limite.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <tr key={p.id_prestamo} className="border-b border-gray-50">
                        <td className="py-2 font-medium">{p.estudiante_nombre}</td>
                        <td className="py-2 text-iu-gray">—</td>
                        <td className="py-2">{p.materia || "—"}</td>
                        <td className="py-2">{p.profesor_encargado || "—"}</td>
                        <td className="py-2">{new Date(p.fecha_limite).toLocaleDateString("es-CO")}</td>
                        <td className="py-2">
                          <span className="text-red-600 font-bold">{diasExtra} d</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Botón para exportar CSV (RF-12) */}
        {prestamos.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Export simple CSV de los datos actuales
                const headers = "Estudiante,Cédula,Contacto,Material,Materia,Curso,Profesor,Fecha Límite\n";
                const rows = prestamos.map((p: any) =>
                  `"${p.estudiante_nombre}","","","","${p.materia||""}","","${p.profesor_encargado||""}","${new Date(p.fecha_limite).toLocaleDateString("es-CO ")}"`
                ).join("\n");
                const blob = new Blob([headers + rows], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `reporte_prestamos.csv`;
                a.click();
              }}
              className="btn-primary text-sm"
            >
              📥 Exportar CSV
            </button>
            <button onClick={() => alert("Exportar PDF: funcionalidad en desarrollo")} className="btn-ghost text-sm">
              📄 Exportar PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  let bg = "bg-iu-primary/10 text-iu-primary";
  if (color === "green") bg = "bg-green-50 text-green-800";
  else if (color === "red") bg = "bg-red-50 text-red-800";

  return (
    <div className={`rounded-xl p-5 ${bg}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs mt-1">{label}</p>
    </div>
  );
}
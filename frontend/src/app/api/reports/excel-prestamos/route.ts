import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/reports/excel-prestamos — CSV (abre en Excel)
// Historial de préstamos POR ACTIVO: cada fila = un activo dentro de un préstamo,
// con el estudiante que lo pidió y el monitor que lo autorizó.
export async function GET() {
  const usuario = await getSessionUser();
  if (!usuario || (usuario.rol !== "admin" && usuario.rol !== "monitor")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const pool = getPool();
  const r = await pool.query(
    `SELECT p.id_prestamo, p.estado_general, p.fecha_inicio, p.fecha_limite,
            p.fecha_cierre_total, p.materia, p.profesor_encargado, p.curso_grupo,
            a.nombre_activo, a.tipo AS tipo_activo, c.nombre_categoria,
            d.cantidad_entregada, d.esta_devuelto, d.observacion_devolucion,
            e.nombre_completo AS estudiante_nombre,
            e.codigo_estudiantil AS estudiante_codigo,
            e.correo_institucional AS estudiante_correo,
            m.nombre_completo AS monitor_nombre,
            p.blockchain_hash
     FROM detalles_prestamo d
     JOIN prestamos p ON p.id_prestamo = d.id_prestamo
     JOIN activos a ON a.id_activo = d.id_activo
     LEFT JOIN categorias c ON c.id_categoria = a.id_categoria
     LEFT JOIN perfiles e ON e.id_perfil = p.id_estudiante
     LEFT JOIN perfiles m ON m.id_perfil = p.id_monitor_validador
     ORDER BY p.fecha_inicio DESC, a.nombre_activo`
  );

  const BOM = "\uFEFF";
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cols = [
    "Activo", "Categoría", "Tipo", "Estado préstamo", "¿Devuelto?",
    "Fecha solicitud", "Fecha límite", "Fecha devolución",
    "Estudiante", "Código estudiante", "Correo estudiante",
    "Monitor que autorizó", "Unidades", "Observación devolución",
    "Materia", "Profesor", "Curso/Grupo", "ID préstamo", "Hash blockchain",
  ];
  let csv = BOM + cols.join(",") + "\n";

  for (const row of r.rows) {
    csv += [
      esc(row.nombre_activo),
      esc(row.nombre_categoria),
      esc(row.tipo_activo),
      esc(row.estado_general),
      esc(row.esta_devuelto ? "Sí" : row.estado_general === "activo" ? "Pendiente" : "No"),
      esc(row.fecha_inicio ? new Date(row.fecha_inicio).toLocaleString("es-CO") : ""),
      esc(row.fecha_limite ? new Date(row.fecha_limite).toLocaleString("es-CO") : ""),
      esc(row.fecha_cierre_total ? new Date(row.fecha_cierre_total).toLocaleString("es-CO") : ""),
      esc(row.estudiante_nombre),
      esc(row.estudiante_codigo),
      esc(row.estudiante_correo),
      esc(row.monitor_nombre),
      esc(row.cantidad_entregada),
      esc(row.observacion_devolucion),
      esc(row.materia),
      esc(row.profesor_encargado),
      esc(row.curso_grupo),
      esc(row.id_prestamo),
      esc(row.blockchain_hash),
    ].join(",") + "\n";
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=historial_prestamos_lab_iu.csv",
    },
  });
}

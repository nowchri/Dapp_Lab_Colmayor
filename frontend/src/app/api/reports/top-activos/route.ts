import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/reports/top-activos — ranking: qué activos acumulan más préstamos
export async function GET() {
  const usuario = await getSessionUser();
  if (!usuario || (usuario.rol !== "admin" && usuario.rol !== "monitor")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const pool = getPool();
  const r = await pool.query(
    `SELECT a.nombre_activo, a.tipo, c.nombre_categoria,
            COUNT(DISTINCT p.id_prestamo) AS total_prestamos,
            COUNT(DISTINCT p.id_prestamo) FILTER (WHERE p.estado_general = 'devuelto') AS devueltos,
            COUNT(DISTINCT p.id_prestamo) FILTER (WHERE p.estado_general = 'activo') AS en_curso,
            COUNT(DISTINCT p.id_prestamo) FILTER (WHERE p.estado_general = 'mora') AS en_mora
     FROM detalles_prestamo d
     JOIN activos a ON a.id_activo = d.id_activo
     LEFT JOIN prestamos p ON p.id_prestamo = d.id_prestamo
     LEFT JOIN categorias c ON c.id_categoria = a.id_categoria
     GROUP BY a.id_activo, a.nombre_activo, a.tipo, c.nombre_categoria
     HAVING COUNT(DISTINCT p.id_prestamo) > 0
     ORDER BY total_prestamos DESC
     LIMIT 20`
  );

  return NextResponse.json(r.rows);
}

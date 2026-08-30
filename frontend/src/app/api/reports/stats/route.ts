import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const r = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM activos WHERE id_activo_padre IS NULL) as total_activos,
       (SELECT COUNT(*) FROM activos WHERE estado = 'disponible' AND id_activo_padre IS NULL) as disponibles,
       (SELECT COUNT(*) FROM activos WHERE estado = 'prestado' AND id_activo_padre IS NULL) as prestados,
       (SELECT COUNT(*) FROM activos WHERE estado = 'dañado' AND id_activo_padre IS NULL) as danados,
       (SELECT COUNT(*) FROM activos WHERE estado = 'mantenimiento' AND id_activo_padre IS NULL) as mantenimiento,
       (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'activo') as prestamos_activos,
       (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'devuelto') as devueltos,
       (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'mora') as en_mora,
       (SELECT COUNT(*) FROM activos WHERE tipo = 'trazable') as total_trazables,
       (SELECT COUNT(*) FROM activos WHERE tipo = 'consumible') as total_consumibles,
       (SELECT COUNT(*) FROM activos WHERE tipo = 'trazable' AND estado = 'prestado') as trazables_prestados,
       (SELECT COUNT(*) FROM activos WHERE tipo = 'consumible' AND estado = 'prestado') as consumibles_prestados`
  );
  return NextResponse.json(r.rows[0]);
}

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const r = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM activos) as total_activos,
       (SELECT COUNT(*) FROM activos WHERE estado = 'disponible') as disponibles,
       (SELECT COUNT(*) FROM activos WHERE estado = 'prestado') as prestados,
       (SELECT COUNT(*) FROM activos WHERE estado = 'dañado') as danados,
       (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'activo') as prestamos_activos,
       (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'devuelto') as devueltos,
       (SELECT COUNT(*) FROM prestamos WHERE fecha_limite + INTERVAL '8 days' < NOW() AND estado_general = 'activo') as en_mora,
       (SELECT COUNT(*) FROM activos WHERE tipo = 'trazable') as total_trazables,
       (SELECT COUNT(*) FROM activos WHERE tipo = 'consumible') as total_consumibles,
       (SELECT COUNT(*) FROM activos WHERE tipo = 'trazable' AND estado = 'prestado') as trazables_prestados,
       (SELECT COUNT(*) FROM activos WHERE tipo = 'consumible' AND estado = 'prestado') as consumibles_prestados`
  );
  return NextResponse.json(r.rows[0]);
}
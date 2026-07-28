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
       (SELECT COUNT(*) FROM prestamos
        WHERE fecha_limite + INTERVAL '8 days' < NOW() AND estado_general = 'activo') as en_mora`
  );
  return NextResponse.json(r.rows[0]);
}

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * GET /api/prestamos/[id]/detalles
 * Devuelve los items de un préstamo con datos del activo.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT dp.*, a.nombre_activo, a.tipo as activo_tipo, a.codigo_qr
     FROM detalles_prestamo dp
     JOIN activos a ON dp.id_activo = a.id_activo
     WHERE dp.id_prestamo = $1
     ORDER BY a.tipo, a.nombre_activo`,
    [params.id]
  );

  return NextResponse.json(result.rows);
}
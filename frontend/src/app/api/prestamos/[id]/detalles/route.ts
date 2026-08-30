import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * GET /api/prestamos/[id]/detalles
 * Devuelve los items de un préstamo con datos del activo
 * + datos de contacto del estudiante (para recordatorios).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT dp.*, a.nombre_activo as activo_nombre, a.tipo as activo_tipo, a.codigo_qr,
            pe.nombre_completo as estudiante_nombre, pe.telefono as estudiante_telefono,
            pe.correo_institucional as estudiante_correo
     FROM detalles_prestamo dp
     JOIN activos a ON dp.id_activo = a.id_activo
     JOIN prestamos p ON p.id_prestamo = dp.id_prestamo
     JOIN perfiles pe ON pe.id_perfil = p.id_estudiante
     WHERE dp.id_prestamo = $1
     ORDER BY a.tipo, a.nombre_activo`,
    [params.id]
  );

  return NextResponse.json(result.rows);
}

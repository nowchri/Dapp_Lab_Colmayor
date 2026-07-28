import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cookies } from "next/headers";

/**
 * POST /api/prestamos/[id]/devolver
 * Monitor registra devolución (RF-11)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const rol = cookieStore.get("userRol")?.value;
  const userId = cookieStore.get("userId")?.value; // real id_perfil

  if (rol !== "monitor" && rol !== "admin") {
    return NextResponse.json({ error: "Solo monitores pueden registrar devoluciones" }, { status: 403 });
  }

  const body = await request.json();
  const { items_devueltos, consumibles_perdidos, observaciones } = body;
  const id_prestamo = params.id;
  const pool = getPool();

  // Marcar cada item como devuelto
  if (items_devueltos) {
    for (const item of items_devueltos) {
      await pool.query(
        `UPDATE detalles_prestamo SET esta_devuelto = true, observacion_devolucion = $1
         WHERE id_detalle = $2 AND id_prestamo = $3`,
        [item.observacion || null, item.id_detalle, id_prestamo]
      );

      // Liberar activo
      await pool.query(
        `UPDATE activos SET estado = 'disponible' WHERE id_activo = (
           SELECT id_activo FROM detalles_prestamo WHERE id_detalle = $1
        )`,
        [item.id_detalle]
      );
    }
  }

  // Verificar si todos los trazables fueron devueltos (Regla 6)
  const pendientes = await pool.query(
    `SELECT COUNT(*) as cnt FROM detalles_prestamo dp
     JOIN activos a ON dp.id_activo = a.id_activo
     WHERE dp.id_prestamo = $1 AND dp.esta_devuelto = false AND a.tipo = 'trazable'`,
    [id_prestamo]
  );

  if (parseInt(pendientes.rows[0].cnt) === 0) {
    // Todos devueltos → cerrar préstamo
    await pool.query(
      `UPDATE prestamos SET estado_general = 'devuelto', fecha_cierre_total = NOW()
       WHERE id_prestamo = $1`,
      [id_prestamo]
    );
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ck = cookies();
  const rol = ck.get("userRol")?.value;
  const userId = ck.get("userId")?.value;
  if (rol !== "monitor" && rol !== "admin") {
    return NextResponse.json({ error: "Solo monitores pueden registrar devoluciones" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const { items_devueltos } = body;
  const id_prestamo = params.id;
  const pool = getPool();

  if (items_devueltos) {
    for (const item of items_devueltos) {
      const estadoFinal = item.estado_final || "disponible";
      const obs = item.observacion || null;

      await pool.query(
        "UPDATE detalles_prestamo SET esta_devuelto = true, observacion_devolucion = $1 WHERE id_detalle = $2 AND id_prestamo = $3",
        [obs, item.id_detalle, id_prestamo]
      );

      // Update asset estado
      await pool.query(
        "UPDATE activos SET estado = $1 WHERE id_activo = (SELECT id_activo FROM detalles_prestamo WHERE id_detalle = $2)",
        [estadoFinal, item.id_detalle]
      );

      // Consumibles: aumentar stock al devolver
      await pool.query(
        `UPDATE activos SET stock_actual = stock_actual + (SELECT cantidad_entregada FROM detalles_prestamo WHERE id_detalle = $1)
         WHERE id_activo = (SELECT id_activo FROM detalles_prestamo WHERE id_detalle = $1) AND tipo = 'consumible'`,
        [item.id_detalle]
      );

      // If observacion provided, also update the asset's observaciones_iniciales
      if (obs) {
        await pool.query(
          "UPDATE activos SET observaciones_iniciales = $1 WHERE id_activo = (SELECT id_activo FROM detalles_prestamo WHERE id_detalle = $2)",
          [obs, item.id_detalle]
        );
      }

      // Check if parent kit should be restored
      const parentInfo = await pool.query(
        "SELECT a.id_activo_padre FROM activos a JOIN detalles_prestamo dp ON dp.id_activo = a.id_activo WHERE dp.id_detalle = $1 AND a.id_activo_padre IS NOT NULL",
        [item.id_detalle]
      );
      if (parentInfo.rows.length > 0) {
        const parentId = parentInfo.rows[0].id_activo_padre;
        const prestadosCount = await pool.query(
          "SELECT COUNT(*) as cnt FROM activos WHERE id_activo_padre = $1 AND estado IN ('prestado','incompleto')",
          [parentId]
        );
        if (parseInt(prestadosCount.rows[0].cnt) === 0) {
          await pool.query("UPDATE activos SET estado = 'disponible' WHERE id_activo = $1", [parentId]);
        }
      }
    }
  }

  const pendientes = await pool.query(
    "SELECT COUNT(*) as cnt FROM detalles_prestamo dp JOIN activos a ON dp.id_activo = a.id_activo WHERE dp.id_prestamo = $1 AND dp.esta_devuelto = false AND a.tipo = 'trazable'",
    [id_prestamo]
  );
  if (parseInt(pendientes.rows[0].cnt) === 0) {
    await pool.query(
      "UPDATE prestamos SET estado_general = 'devuelto', fecha_cierre_total = NOW(), id_monitor_validador = $1 WHERE id_prestamo = $2",
      [userId, id_prestamo]
    );
  }
  return NextResponse.json({ success: true });
}
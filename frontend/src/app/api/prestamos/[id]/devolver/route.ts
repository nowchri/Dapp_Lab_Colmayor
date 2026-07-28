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
      await pool.query(
        "UPDATE detalles_prestamo SET esta_devuelto = true, observacion_devolucion = $1 WHERE id_detalle = $2 AND id_prestamo = $3",
        [item.observacion || null, item.id_detalle, id_prestamo]
      );
      // Update the asset
      await pool.query(
        "UPDATE activos SET estado = $1 WHERE id_activo = (SELECT id_activo FROM detalles_prestamo WHERE id_detalle = $2)",
        [estadoFinal, item.id_detalle]
      );

      // Check if this asset has a parent kit — if all siblings are now returned, restore parent
      const parentInfo = await pool.query(
        "SELECT a.id_activo_padre FROM activos a JOIN detalles_prestamo dp ON dp.id_activo = a.id_activo WHERE dp.id_detalle = $1 AND a.id_activo_padre IS NOT NULL",
        [item.id_detalle]
      );
      if (parentInfo.rows.length > 0) {
        const parentId = parentInfo.rows[0].id_activo_padre;
        // Check if all children of this kit are now available (not prestado)
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
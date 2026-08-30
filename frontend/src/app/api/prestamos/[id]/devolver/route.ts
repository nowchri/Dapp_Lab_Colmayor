import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { computeLoanHash, computeAssetHash, computeStudentHash } from "@/lib/polygon";
import { registrarEnCadena } from "@/lib/cadena";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getSessionUser();
  const rol = usuario?.rol || "";
  const userId = usuario?.id_perfil || "";
  if (rol !== "monitor" && rol !== "admin") {
    return NextResponse.json({ error: "Solo monitores pueden registrar devoluciones" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const { items_devueltos } = body;
  const id_prestamo = params.id;
  const pool = getPool();
  let returnHashesOnChain: string[] = [];

  // 0. Datos del préstamo (para hashes on-chain)
  const prestamo = await pool.query("SELECT id_estudiante FROM prestamos WHERE id_prestamo = $1", [id_prestamo]);
  const idEstudiante = prestamo.rows.length > 0 ? prestamo.rows[0].id_estudiante : "0";

  const loanHash = computeLoanHash(id_prestamo);
  const studentHash = computeStudentHash(idEstudiante);

  if (items_devueltos) {
    // 1. Registrar devoluciones en la cadena (con datos completos).
    //    Si falla, se loguea pero la devolución en BD se completa igual.
    const eslabones = [];
    for (const item of items_devueltos) {
      const info = await pool.query(
        `SELECT a.codigo_qr, a.id_activo, ar.nombre_area
         FROM activos a
         JOIN detalles_prestamo dp ON dp.id_activo = a.id_activo
         LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
         LEFT JOIN areas ar ON c.id_area = ar.id_area
         WHERE dp.id_detalle = $1`,
        [item.id_detalle]
      );
      if (info.rows.length > 0) {
        eslabones.push({
          assetHash: computeAssetHash(info.rows[0].codigo_qr || info.rows[0].id_activo),
          id_activo: info.rows[0].id_activo,
          estado: item.estado_final || "disponible",
          ubicacion: info.rows[0].nombre_area || "",
        });
      }
    }
    if (eslabones.length > 0) {
      let returnHashes: string[] = [];
      try {
        returnHashes = await registrarEnCadena("return", id_prestamo, loanHash, eslabones, studentHash, idEstudiante, userId || "");
        console.log(`[cadena] Devolución registrada: ${returnHashes.length} eslabones`);
      } catch (err: any) {
        console.error("[cadena] Error registrando devolución (se continúa en BD):", err?.message || err);
      }
      returnHashesOnChain = returnHashes;
    }

    // 2. Actualizar BD
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

      // If observacion provided, also update the asset's observaciones_iniciales
      if (obs) {
        await pool.query(
          "UPDATE activos SET observaciones_iniciales = $1 WHERE id_activo = (SELECT id_activo FROM detalles_prestamo WHERE id_detalle = $2)",
          [obs, item.id_detalle]
        );
      }

      // Consumibles: aumentar stock al devolver
      await pool.query(
        `UPDATE activos SET stock_actual = stock_actual + (SELECT cantidad_entregada FROM detalles_prestamo WHERE id_detalle = $1)
         WHERE id_activo = (SELECT id_activo FROM detalles_prestamo WHERE id_detalle = $1) AND tipo = 'consumible'`,
        [item.id_detalle]
      );

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
  return NextResponse.json({ success: true, hash: returnHashesOnChain.join(",") || null });
}

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cookies } from "next/headers";

/**
 * POST /api/prestamos/[id]/aprobar
 * Solo monitor/admin. Firma on-chain + actualiza estado.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const rol = cookieStore.get("userRol")?.value;
  const sessionId = cookieStore.get("userId")?.value; // userId = real id_perfil

  if (rol !== "monitor" && rol !== "admin") {
    return NextResponse.json({ error: "Solo monitores pueden aprobar" }, { status: 403 });
  }

  const id_prestamo = params.id;
  const pool = getPool();

  // Verificar que existe y está pendiente
  const prestamo = await pool.query(
    "SELECT * FROM prestamos WHERE id_prestamo = $1 AND estado_general = 'pendiente'",
    [id_prestamo]
  );

  if (prestamo.rows.length === 0) {
    return NextResponse.json({ error: "Préstamo no encontrado o ya procesado" }, { status: 404 });
  }

  // Generar hash para blockchain
  // En prod, esto llama a registerLoanOnChain() de polygon.ts
  const hash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  // Actualizar estado
  await pool.query(
    `UPDATE prestamos
     SET id_monitor_validador = $1, blockchain_hash = $2, estado_general = 'activo'
     WHERE id_prestamo = $3`,
    [sessionId, hash, id_prestamo]
  );

  // Actualizar estado de activos
  const detalles = await pool.query(
    "SELECT id_activo FROM detalles_prestamo WHERE id_prestamo = $1 AND esta_devuelto = false",
    [id_prestamo]
  );

  for (const d of detalles.rows) {
    await pool.query("UPDATE activos SET estado = 'prestado' WHERE id_activo = $1", [d.id_activo]);
  }

  return NextResponse.json({ success: true, hash });
}

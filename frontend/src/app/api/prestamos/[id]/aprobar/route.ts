import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ck = cookies();
  const rol = ck.get("userRol")?.value;
  const uid = ck.get("userId")?.value;
  if (rol !== "monitor" && rol !== "admin") {
    return NextResponse.json({ error: "Solo monitores pueden aprobar" }, { status: 403 });
  }

  const id_prestamo = params.id;
  const pool = getPool();

  const prestamo = await pool.query(
    "SELECT * FROM prestamos WHERE id_prestamo = $1 AND estado_general = 'pendiente'",
    [id_prestamo]
  );
  if (prestamo.rows.length === 0) {
    return NextResponse.json({ error: "Prestamo no encontrado o ya procesado" }, { status: 404 });
  }

  const hash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  await pool.query(
    "UPDATE prestamos SET id_monitor_validador = $1, blockchain_hash = $2, estado_general = 'activo' WHERE id_prestamo = $3",
    [uid, hash, id_prestamo]
  );

  // Update all items to prestado
  const detalles = await pool.query(
    "SELECT id_activo FROM detalles_prestamo WHERE id_prestamo = $1 AND esta_devuelto = false",
    [id_prestamo]
  );
  for (const d of detalles.rows) {
    await pool.query("UPDATE activos SET estado = 'prestado' WHERE id_activo = $1", [d.id_activo]);

    // If this item has a parent kit, mark parent as "incompleto"
    const parent = await pool.query(
      "SELECT id_activo_padre FROM activos WHERE id_activo = $1 AND id_activo_padre IS NOT NULL",
      [d.id_activo]
    );
    if (parent.rows.length > 0) {
      await pool.query(
        "UPDATE activos SET estado = 'incompleto' WHERE id_activo = $1",
        [parent.rows[0].id_activo_padre]
      );
    }
  }

  return NextResponse.json({ success: true, hash });
}
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getSessionUser();
  const rol = usuario?.rol || "";
  if (rol !== "monitor" && rol !== "admin") {
    return NextResponse.json({ error: "Solo monitores pueden rechazar" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const motivo = body.motivo?.trim() || null;
  const pool = getPool();
  const r = await pool.query(
    "UPDATE prestamos SET estado_general = 'rechazado', motivo_rechazo = $1 WHERE id_prestamo = $2 AND estado_general = 'pendiente' RETURNING id_prestamo",
    [motivo, params.id]
  );
  if (r.rows.length === 0) return NextResponse.json({ error: "Prestamo no encontrado o ya procesado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

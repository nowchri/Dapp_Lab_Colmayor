import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await getSessionUser();
  if (!usuario || usuario.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const pool = getPool();
  const r = await pool.query(
    "SELECT id_perfil, codigo_estudiantil, cedula, nombre_completo, correo_institucional, telefono, rol FROM perfiles WHERE rol = 'estudiante' ORDER BY nombre_completo"
  );
  return NextResponse.json(r.rows);
}

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// GET — obtener perfil + stats del usuario logueado
export async function GET() {
  const usuario = await getSessionUser();
  if (!usuario) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const uid = usuario.id_perfil;

  const pool = getPool();

  // Datos del perfil
  const perfil = await pool.query(
    "SELECT id_perfil, codigo_estudiantil, cedula, nombre_completo, correo_institucional, telefono, rol FROM perfiles WHERE id_perfil = $1",
    [uid]
  );
  if (perfil.rows.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Stats de prestamos
  const stats = await pool.query(
    `SELECT
       COUNT(*) as total_prestamos,
       COUNT(*) FILTER (WHERE estado_general = 'devuelto') as devueltos
     FROM prestamos WHERE id_estudiante = $1`,
    [uid]
  );

  return NextResponse.json({
    ...perfil.rows[0],
    ...stats.rows[0],
  });
}

// PUT — actualizar campos no criticos
export async function PUT(request: NextRequest) {
  const usuario = await getSessionUser();
  if (!usuario) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const uid = usuario.id_perfil;

  try {
    const body = await request.json();
    const { nombre_completo, telefono } = body;

    const pool = getPool();
    const updates: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (nombre_completo) { updates.push(`nombre_completo = $${idx++}`); vals.push(nombre_completo.trim()); }
    if (telefono !== undefined) { updates.push(`telefono = $${idx++}`); vals.push(telefono || null); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    vals.push(uid);
    await pool.query(`UPDATE perfiles SET ${updates.join(", ")} WHERE id_perfil = $${idx}`, vals);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

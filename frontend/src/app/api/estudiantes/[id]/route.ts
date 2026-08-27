import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// PUT — modificar datos del estudiante
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { nombre_completo, codigo_estudiantil, cedula, telefono, correo_institucional } = body;
    const pool = getPool();
    await pool.query(
      "UPDATE perfiles SET nombre_completo = COALESCE($1, nombre_completo), codigo_estudiantil = COALESCE($2, codigo_estudiantil), cedula = COALESCE($3, cedula), telefono = COALESCE($4, telefono), correo_institucional = COALESCE($5, correo_institucional) WHERE id_perfil = $6",
      [nombre_completo || null, codigo_estudiantil || null, cedula || null, telefono || null, correo_institucional || null, params.id]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — eliminar estudiante
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = getPool();
    // Check no active loans
    const active = await pool.query("SELECT COUNT(*) as cnt FROM prestamos WHERE id_estudiante = $1 AND estado_general IN ('activo','pendiente')", [params.id]);
    if (parseInt(active.rows[0].cnt) > 0) {
      return NextResponse.json({ error: "No se puede eliminar: tiene prestamos activos" }, { status: 400 });
    }
    await pool.query("DELETE FROM perfiles WHERE id_perfil = $1 AND rol = 'estudiante'", [params.id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

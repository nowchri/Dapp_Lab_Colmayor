import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// PUT — resetear contraseña (la limpia → el monitor crea una nueva en su primer ingreso)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getSessionUser();
  if (!usuario || usuario.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const pool = getPool();
    if (body.reset_password) {
      const r = await pool.query(
        "UPDATE perfiles SET password_hash = NULL WHERE id_perfil = $1 AND rol = 'monitor' RETURNING id_perfil",
        [params.id]
      );
      if (r.rows.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — eliminar monitor
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getSessionUser();
  if (!usuario || usuario.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const pool = getPool();
    const r = await pool.query("DELETE FROM perfiles WHERE id_perfil = $1 AND rol = 'monitor' RETURNING id_perfil", [params.id]);
    if (r.rows.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

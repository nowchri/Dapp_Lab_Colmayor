import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// DELETE — eliminar monitor
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = getPool();
    const r = await pool.query("DELETE FROM perfiles WHERE id_perfil = $1 AND rol = 'monitor' RETURNING id_perfil", [params.id]);
    if (r.rows.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

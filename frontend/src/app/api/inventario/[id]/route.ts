import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cookies } from "next/headers";

// PUT /api/inventario/[id] — cambiar estado del activo
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const ck = cookies();
  const rol = ck.get("userRol")?.value;
  if (rol !== "monitor" && rol !== "admin") {
    return NextResponse.json({ error: "Solo monitores/admin pueden cambiar estados" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const { estado, id_categoria } = body;
  const pool = getPool();

  if (estado) {
    if (!["disponible","dañado","mantenimiento","prestado","incompleto"].includes(estado)) {
      return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
    }
    await pool.query("UPDATE activos SET estado = $1 WHERE id_activo = $2", [estado, params.id]);
  }

  if (id_categoria !== undefined) {
    await pool.query("UPDATE activos SET id_categoria = $1 WHERE id_activo = $2", [id_categoria || null, params.id]);
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/inventario/[id] — eliminar un componente de kit
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const ck = cookies();
  const rol = ck.get("userRol")?.value;
  if (rol !== "monitor" && rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const pool = getPool();
  const item = await pool.query("SELECT id_activo_padre, estado FROM activos WHERE id_activo = $1", [params.id]);
  if (item.rows.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const { id_activo_padre, estado } = item.rows[0];
  if (!id_activo_padre) return NextResponse.json({ error: "Solo componentes de kits" }, { status: 400 });
  if (estado !== "disponible") return NextResponse.json({ error: "Solo disponibles" }, { status: 400 });
  await pool.query("DELETE FROM activos WHERE id_activo = $1", [params.id]);
  return NextResponse.json({ ok: true });
}
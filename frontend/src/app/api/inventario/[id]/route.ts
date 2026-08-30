import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// PUT /api/inventario/[id] — cambiar estado del activo
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getSessionUser();
  if (!usuario || (usuario.rol !== "monitor" && usuario.rol !== "admin")) {
    return NextResponse.json({ error: "Solo monitores/admin pueden cambiar estados" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const { estado, id_categoria, stock_actual, observaciones_iniciales } = body;
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

  if (stock_actual !== undefined) {
    if (typeof stock_actual !== "number" || stock_actual < 0) {
      return NextResponse.json({ error: "Stock invalido" }, { status: 400 });
    }
    await pool.query("UPDATE activos SET stock_actual = $1 WHERE id_activo = $2", [stock_actual, params.id]);
  }

  if (observaciones_iniciales !== undefined) {
    if (typeof observaciones_iniciales !== "string") {
      return NextResponse.json({ error: "Observaciones invalidas" }, { status: 400 });
    }
    await pool.query("UPDATE activos SET observaciones_iniciales = $1 WHERE id_activo = $2", [observaciones_iniciales || null, params.id]);
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/inventario/[id] — eliminar un componente de kit
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getSessionUser();
  if (!usuario || (usuario.rol !== "monitor" && usuario.rol !== "admin")) {
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
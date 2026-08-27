import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// GET /api/inventario/[id]/children — listar los hijos de un kit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  const r = await pool.query(
    "SELECT id_activo, nombre_activo, tipo, estado FROM activos WHERE id_activo_padre = $1 ORDER BY nombre_activo",
    [params.id]
  );
  return NextResponse.json(r.rows);
}
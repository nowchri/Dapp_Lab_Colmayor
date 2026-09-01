import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const pool = getPool();
  const r = await pool.query(
    `SELECT c.*, a.nombre_area, a.descripcion as area_descripcion
     FROM categorias c JOIN areas a ON c.id_area = a.id_area ORDER BY a.nombre_area, c.nombre_categoria`
  );
  return NextResponse.json(r.rows);
}

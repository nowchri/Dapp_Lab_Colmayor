import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM categorias ORDER BY nombre_categoria");
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nombre_categoria, descripcion_categoria } = body;
  if (!nombre_categoria) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const pool = getPool();
  const r = await pool.query(
    "INSERT INTO categorias (nombre_categoria, descripcion_categoria) VALUES ($1, $2) RETURNING *",
    [nombre_categoria.trim(), descripcion_categoria || null]
  );
  return NextResponse.json(r.rows[0], { status: 201 });
}

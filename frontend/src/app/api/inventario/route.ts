import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT a.*, c.nombre_categoria, c.descripcion_categoria, ar.nombre_area,
              (SELECT COUNT(*) FROM activos WHERE id_activo_padre = a.id_activo) as componentes
       FROM activos a
       LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
       LEFT JOIN areas ar ON c.id_area = ar.id_area
       WHERE a.id_activo_padre IS NULL
       ORDER BY a.tipo, a.nombre_activo`
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("[inventario/GET]", error.message);
    return NextResponse.json({ error: "Error al consultar inventario" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre_activo, codigo_qr, id_categoria, id_activo_padre, tipo, observaciones_iniciales, stock_actual } = body;
    if (!nombre_activo) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
    const pool = getPool();
    const dup = await pool.query(
      "SELECT id_activo FROM activos WHERE nombre_activo = $1 OR (codigo_qr IS NOT NULL AND codigo_qr = $2)",
      [nombre_activo.trim(), codigo_qr || null]
    );
    if (dup.rows.length > 0) return NextResponse.json({ error: "Ya existe un activo con ese nombre o QR" }, { status: 409 });
    const result = await pool.query(
      "INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, id_activo_padre, tipo, observaciones_iniciales, stock_actual) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [codigo_qr || null, nombre_activo.trim(), id_categoria || null, id_activo_padre || null, tipo || "trazable", observaciones_iniciales || null, stock_actual || 0]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("[inventario/POST]", error.message);
    return NextResponse.json({ error: "Error al registrar activo" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const pool = getPool();
  // Ensure table exists
  await pool.query("CREATE TABLE IF NOT EXISTS configuracion (clave TEXT PRIMARY KEY, valor TEXT)");
  await pool.query("INSERT INTO configuracion (clave, valor) VALUES ('horario_monitor', 'El monitor está disponible de L-V 8am-12pm y 2pm-6pm') ON CONFLICT (clave) DO NOTHING");
  await pool.query("INSERT INTO configuracion (clave, valor) VALUES ('bloqueo_por_mora', 'true') ON CONFLICT (clave) DO NOTHING");

  const r = await pool.query("SELECT clave, valor FROM configuracion");
  const config: Record<string, string> = {};
  for (const row of r.rows) config[row.clave] = row.valor;
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const pool = getPool();
    await pool.query("CREATE TABLE IF NOT EXISTS configuracion (clave TEXT PRIMARY KEY, valor TEXT)");
    for (const [key, val] of Object.entries(body)) {
      await pool.query("INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = $2", [key, String(val)]);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

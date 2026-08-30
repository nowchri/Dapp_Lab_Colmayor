import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const usuario = await getSessionUser();
  if (!usuario) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Admin/monitor sin contraseña → debe crearla antes de usar el sistema
  let primer_ingreso = false;
  if (usuario.rol === "admin" || usuario.rol === "monitor") {
    const { getPool } = await import("@/lib/db");
    try {
      const r = await getPool().query("SELECT password_hash FROM perfiles WHERE id_perfil = $1", [usuario.id_perfil]);
      if (r.rows.length > 0 && !r.rows[0].password_hash) primer_ingreso = true;
    } catch {}
  }

  return NextResponse.json({
    authenticated: true,
    primer_ingreso,
    user: usuario,
  });
}

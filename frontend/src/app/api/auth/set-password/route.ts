import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/auth/set-password
 * Crea o cambia la contraseña del usuario en sesión (solo admin/monitor).
 * Body: { current?, password, password2 }
 * - Sin contraseña previa (primer ingreso): current opcional.
 * - Con contraseña previa (cambio desde perfil): current obligatoria y verificada.
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getSessionUser();
    if (!usuario || (usuario.rol !== "admin" && usuario.rol !== "monitor")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const userId = usuario.id_perfil;

    const { current, password, password2 } = await request.json().catch(() => ({}));
    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    if (password !== password2) {
      return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });
    }

    const pool = getPool();
    const r = await pool.query(
      "SELECT password_hash FROM perfiles WHERE id_perfil = $1 AND rol IN ('admin','monitor')",
      [userId]
    );
    if (r.rows.length === 0) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const hashActual = r.rows[0].password_hash;

    // Ya tiene contraseña → pedir la actual para cambiar
    if (hashActual) {
      if (!current) {
        return NextResponse.json({ error: "Debes escribir tu contraseña actual" }, { status: 400 });
      }
      const ok = await bcrypt.compare(String(current), hashActual);
      if (!ok) {
        return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 401 });
      }
    }

    const hash = await bcrypt.hash(String(password), 10);
    await pool.query("UPDATE perfiles SET password_hash = $1 WHERE id_perfil = $2", [hash, userId]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[set-password]", e);
    return NextResponse.json({ error: "Error interno: " + e.message }, { status: 500 });
  }
}

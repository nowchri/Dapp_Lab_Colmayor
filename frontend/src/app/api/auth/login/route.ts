import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import crypto from "crypto";

// In-memory session store (dev only)
const sessionStore = new Map<string, { id_perfil: string; nombre_completo: string; rol: string; expires: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessionStore.entries()) if (now > v.expires) sessionStore.delete(k);
}, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const { correo } = await request.json().catch(() => ({ correo: "" }));

    if (!correo || !/^[^@\s]+@unimayor\.edu\.co$/i.test(String(correo))) {
      return NextResponse.json({ error: "Correo institucional invalido. Debe terminar en @unimayor.edu.co" }, { status: 400 });
    }

    const pool = getPool();
    const r = await pool.query(
      "SELECT id_perfil, nombre_completo, rol FROM perfiles WHERE correo_institucional = $1",
      [correo.toLowerCase().trim()]
    );

    if (r.rows.length === 0) {
      return NextResponse.json({ error: "No estas registrado. Verifica tu correo o contacta al administrador." }, { status: 401 });
    }

    const user = r.rows[0];
    const sid = crypto.randomBytes(16).toString("hex");
    sessionStore.set(sid, { ...user, expires: Date.now() + 30 * 60 * 1000 });

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set("session", sid, { httpOnly: true, path: "/", maxAge: 30 * 60, sameSite: "lax" });
    res.cookies.set("userRol", user.rol, { httpOnly: false, path: "/" , maxAge: 30 * 60, sameSite: "lax" });
    res.cookies.set("userId", String(user.id_perfil), { httpOnly: false, path: "/", maxAge: 30 * 60, sameSite: "lax" });
    return res;
  } catch (e: any) {
    console.error("[login]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

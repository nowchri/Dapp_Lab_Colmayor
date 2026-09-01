import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// POST /api/push/subscribe — guarda la suscripción Web Push del usuario logueado
export async function POST(request: NextRequest) {
  const usuario = await getSessionUser();
  if (!usuario) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      `INSERT INTO push_suscripciones (id_perfil, endpoint, p256dh, auth_key, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET
         id_perfil = EXCLUDED.id_perfil,
         p256dh = EXCLUDED.p256dh,
         auth_key = EXCLUDED.auth_key,
         user_agent = EXCLUDED.user_agent,
         ultimo_uso = NOW()`,
      [usuario.id_perfil, sub.endpoint, sub.keys.p256dh, sub.keys.auth, request.headers.get("user-agent") || null]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[push/subscribe]", e);
    return NextResponse.json({ error: "Error al guardar la suscripción" }, { status: 500 });
  }
}

// DELETE /api/push/subscribe — elimina la suscripción del usuario
export async function DELETE(request: NextRequest) {
  const usuario = await getSessionUser();
  if (!usuario) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { endpoint } = await request.json().catch(() => ({}));
    if (!endpoint) return NextResponse.json({ error: "endpoint requerido" }, { status: 400 });
    const pool = getPool();
    await pool.query("DELETE FROM push_suscripciones WHERE endpoint = $1 AND id_perfil = $2", [endpoint, usuario.id_perfil]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

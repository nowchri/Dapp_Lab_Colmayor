import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import bcrypt from "bcryptjs";
import { crearSesion, limpiarSesionesVencidas } from "@/lib/auth";

// Límite de intentos fallidos por correo (solo admin/monitor)
const intentos = new Map<string, { count: number; bloqueadoHasta: number }>();
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

function setCookies(res: NextResponse, sid: string, user: { id_perfil: string; rol: string }) {
  res.cookies.set("session", sid, { httpOnly: true, path: "/", maxAge: 30 * 60, sameSite: "lax" });
  res.cookies.set("userRol", user.rol, { httpOnly: false, path: "/", maxAge: 30 * 60, sameSite: "lax" });
  res.cookies.set("userId", String(user.id_perfil), { httpOnly: false, path: "/", maxAge: 30 * 60, sameSite: "lax" });
}

export async function POST(request: NextRequest) {
  try {
    const { correo, password } = await request.json().catch(() => ({ correo: "", password: "" }));

    if (!correo || !/^[^@\s]+@unimayor\.edu\.co$/i.test(String(correo))) {
      return NextResponse.json({ error: "Correo institucional invalido. Debe terminar en @unimayor.edu.co" }, { status: 400 });
    }

    const email = correo.toLowerCase().trim();
    const pool = getPool();
    const r = await pool.query(
      "SELECT id_perfil, nombre_completo, rol, password_hash FROM perfiles WHERE correo_institucional = $1",
      [email]
    );

    if (r.rows.length === 0) {
      return NextResponse.json({ error: "No estas registrado. Verifica tu correo o contacta al administrador." }, { status: 401 });
    }

    const user = r.rows[0];
    const esPrivilegiado = user.rol === "admin" || user.rol === "monitor";
    let primerIngreso = false;

    // ── Admin/Monitor: contraseña obligatoria ──
    if (esPrivilegiado) {
      const registro = intentos.get(email);
      if (registro && Date.now() < registro.bloqueadoHasta) {
        const min = Math.ceil((registro.bloqueadoHasta - Date.now()) / 60000);
        return NextResponse.json({ error: `Demasiados intentos. Probá de nuevo en ${min} min.` }, { status: 429 });
      }

      // Primer ingreso: aún no tiene contraseña asignada → sesión + crear contraseña
      if (!user.password_hash) {
        primerIngreso = true;
      } else {
        // Sin contraseña enviada → pedirla
        if (!password) {
          return NextResponse.json({ error: "Tu cuenta requiere contraseña", requiere_password: true }, { status: 400 });
        }

        // Verificar contraseña
        const ok = await bcrypt.compare(String(password), user.password_hash);
        if (!ok) {
          const prev = intentos.get(email) || { count: 0, bloqueadoHasta: 0 };
          const nuevo = { count: prev.count + 1, bloqueadoHasta: prev.count + 1 >= MAX_INTENTOS ? Date.now() + BLOQUEO_MS : 0 };
          intentos.set(email, nuevo);
          if (nuevo.bloqueadoHasta > 0) {
            return NextResponse.json({ error: `Demasiados intentos fallidos. Cuenta bloqueada 15 min.` }, { status: 429 });
          }
          return NextResponse.json({ error: `Contraseña incorrecta. Quedan ${MAX_INTENTOS - nuevo.count} intentos.` }, { status: 401 });
        }
        intentos.delete(email);
      }
    }

    // ── Sesión persistente en BD ──
    await limpiarSesionesVencidas();
    const sid = await crearSesion({
      id_perfil: user.id_perfil,
      rol: user.rol,
      nombre_completo: user.nombre_completo,
    });

    const userSeguro = { id_perfil: user.id_perfil, nombre_completo: user.nombre_completo, rol: user.rol };
    const res = NextResponse.json({ ok: true, user: userSeguro, ...(primerIngreso ? { primer_ingreso: true } : {}) });
    setCookies(res, sid, userSeguro);
    return res;
  } catch (e: any) {
    console.error("[login]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

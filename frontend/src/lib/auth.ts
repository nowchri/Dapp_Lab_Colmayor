/**
 * auth.ts — Sesiones persistentes en BD (tabla `sesiones`)
 *
 * Por qué: en Vercel (serverless) la memoria del servidor no persiste entre
 * peticiones, y las cookies userRol/userId NO son confiables (no httpOnly).
 * La cookie httpOnly `session` es la única fuente de verdad → se valida contra
 * la tabla `sesiones` en cada ruta protegida.
 */
import { cookies } from "next/headers";
import crypto from "crypto";
import { getPool } from "@/lib/db";

export interface UsuarioSesion {
  id_perfil: string;
  rol: string;
  nombre_completo: string;
}

const DURACION_MS = 30 * 60 * 1000; // 30 min

/** Crea una sesión en BD y devuelve el sid (para la cookie httpOnly). */
export async function crearSesion(user: UsuarioSesion): Promise<string> {
  const sid = crypto.randomBytes(16).toString("hex");
  const expires = new Date(Date.now() + DURACION_MS);
  const pool = getPool();
  await pool.query(
    `INSERT INTO sesiones (sid, id_perfil, rol, nombre_completo, expires)
     VALUES ($1, $2, $3, $4, $5)`,
    [sid, user.id_perfil, user.rol, user.nombre_completo, expires]
  );
  return sid;
}

/** Valida la cookie de sesión contra la BD. Devuelve el usuario o null. */
export async function getSessionUser(): Promise<UsuarioSesion | null> {
  const sid = cookies().get("session")?.value;
  if (!sid) return null;

  try {
    const pool = getPool();
    const r = await pool.query(
      `SELECT id_perfil, rol, nombre_completo, expires FROM sesiones
       WHERE sid = $1 AND expires > NOW()`,
      [sid]
    );
    if (r.rows.length === 0) return null;
    const s = r.rows[0];
    return { id_perfil: String(s.id_perfil), rol: s.rol, nombre_completo: s.nombre_completo };
  } catch {
    return null;
  }
}

/** Elimina la sesión actual (logout). */
export async function borrarSesion(): Promise<void> {
  const sid = cookies().get("session")?.value;
  if (!sid) return;
  try {
    const pool = getPool();
    await pool.query("DELETE FROM sesiones WHERE sid = $1", [sid]);
  } catch {}
}

/** Limpieza periódica de sesiones vencidas (se llama al crear una nueva). */
export async function limpiarSesionesVencidas(): Promise<void> {
  try {
    const pool = getPool();
    await pool.query("DELETE FROM sesiones WHERE expires < NOW()");
  } catch {}
}

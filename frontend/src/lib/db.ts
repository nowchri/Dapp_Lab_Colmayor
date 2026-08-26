/**
 * db.ts — PostgreSQL connection pool (SERVER-SIDE ONLY)
 *
 * PUNTO DE CONEXION: local o Supabase
 *   Local:    postgresql://postgres:***@localhost:5432/Bd_laboratorio
 *   Supabase: postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
 *   (usar SIEMPRE el pooler :6543 — la conexión directa db.*.supabase.co es solo-IPv6)
 */

import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:***@localhost:5432/Bd_laboratorio";

const esSupabase = DATABASE_URL.includes("supabase.co");

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
      // Supabase usa certificados propios: desactivar verificación (estándar en serverless)
      ...(esSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    pool.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err.message);
    });
  }
  return pool;
}

// Helpers tipados
export { Pool } from "pg";

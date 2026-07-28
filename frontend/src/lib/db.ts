/**
 * db.ts — PostgreSQL connection pool (SERVER-SIDE ONLY)
 *
 * PUNTO DE CONEXION: PostgreSQL local
 *   DATABASE_URL=postgresql://postgres:1234@localhost:5432/Bd_laboratorio
 */

import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:1234@localhost:5432/Bd_laboratorio";

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err.message);
    });
  }
  return pool;
}

// Helpers tipados
export { Pool } from "pg";
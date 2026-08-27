// Crea la tabla registro_blockchain (cadena de hash simulada)
// Uso: node scripts/crear-tabla-cadena.mjs
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ENV = join(__dirname, "..", "frontend", ".env");
const envText = readFileSync(FRONTEND_ENV, "utf8");
const m = envText.match(/DATABASE_URL=(.+)/);
if (!m) { console.error("No se encontró DATABASE_URL"); process.exit(1); }

const client = new pg.Client({ connectionString: m[1].trim() });
await client.connect();
await client.query(`
  CREATE TABLE IF NOT EXISTS registro_blockchain (
    id_registro BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('loan','return')),
    id_prestamo UUID NOT NULL,
    loan_hash TEXT NOT NULL,
    asset_hash TEXT NOT NULL,
    student_hash TEXT NOT NULL,
    prev_hash TEXT,
    hash_registro TEXT NOT NULL UNIQUE,
    fecha TIMESTAMPTZ DEFAULT NOW()
  )
`);
console.log("Tabla registro_blockchain creada ✓");
await client.end();

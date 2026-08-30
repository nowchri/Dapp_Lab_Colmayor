// Agrega las columnas de datos completos a registro_blockchain
// Uso: node scripts/migracion-eslabones.mjs
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, "..", "frontend", ".env"), "utf8");
// Línea ACTIVA (ignorar comentadas): la última DATABASE_URL sin #
const lineas = envText.split("\n").filter(l => l.startsWith("DATABASE_URL="));
const m = lineas.length > 0 ? lineas[lineas.length - 1].match(/DATABASE_URL=(.+)/) : null;
if (!m) { console.error("No se encontró DATABASE_URL"); process.exit(1); }

const client = new pg.Client({
  connectionString: m[1].trim(),
  ssl: m[1].includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
await client.query(`
  ALTER TABLE registro_blockchain
    ADD COLUMN IF NOT EXISTS id_estudiante UUID,
    ADD COLUMN IF NOT EXISTS id_monitor UUID,
    ADD COLUMN IF NOT EXISTS id_activo UUID,
    ADD COLUMN IF NOT EXISTS monitor_hash TEXT,
    ADD COLUMN IF NOT EXISTS estado TEXT,
    ADD COLUMN IF NOT EXISTS ubicacion TEXT
`);
const r = await client.query("SELECT current_database() as db, (SELECT count(*) FROM registro_blockchain) as eslabones");
console.log("BD:", r.rows[0].db, "| eslabones:", r.rows[0].eslabones);
const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='registro_blockchain' ORDER BY ordinal_position");
console.log("Columnas:", cols.rows.map(c => c.column_name).join(", "));
await client.end();

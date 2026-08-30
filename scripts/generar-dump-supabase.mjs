// Genera scripts/supabase_dump.sql — esquema + datos de la BD local para Supabase
// Uso: node scripts/generar-dump-supabase.mjs
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, "..", "frontend", ".env"), "utf8");
// Línea ACTIVA (ignorar comentadas)
const lineas = envText.split("\n").filter(l => l.startsWith("DATABASE_URL="));
const m = lineas.length > 0 ? lineas[lineas.length - 1].match(/DATABASE_URL=(.+)/) : null;
if (!m) { console.error("No se encontró DATABASE_URL"); process.exit(1); }
const DB_URL = m[1].trim();

const client = new pg.Client({ connectionString: DB_URL, ssl: DB_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined });
await client.connect();

const TABLES = ["areas", "categorias", "configuracion", "perfiles", "activos", "prestamos", "detalles_prestamo", "registro_blockchain"];

let sql = `-- ============================================================
-- DUMP COMPLETO para Supabase — Lab IUCMC
-- Generado: ${new Date().toISOString()}
-- Pegar TODO en: Supabase → SQL Editor → New query → Run
-- ============================================================

`;


// ---------- ENUMS ----------
const ENUMS = {
  rol_usuario: ["estudiante", "monitor", "admin"],
  tipo_activo: ["trazable", "consumible"],
  estado_activo: ["disponible", "prestado", "dañado", "mantenimiento", "incompleto"],
  estado_prestamo: ["pendiente", "activo", "devuelto", "rechazado", "mora"],
};
for (const [name, values] of Object.entries(ENUMS)) {
  sql += `-- ---------- enum ${name} ----------\n`;
  sql += `DO $$ BEGIN\n  CREATE TYPE ${name} AS ENUM (${values.map(v => `'${v}'`).join(", ")});\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;\n\n`;
}

// ---------- CREATE TABLE ----------
for (const t of TABLES) {
  const cols = await client.query(
    `SELECT column_name, data_type, udt_name, character_maximum_length, numeric_precision, is_nullable, column_default
     FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [t]
  );
  const pk = await client.query(
    `SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
     WHERE i.indrelid='public.${t}'::regclass AND i.indisprimary`,
    []
  );
  const uniques = await client.query(
    `SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint
     WHERE conrelid='public.${t}'::regclass AND contype IN ('u','c') ORDER BY conname`,
    []
  );
  const fks = await client.query(
    `SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint
     WHERE conrelid='public.${t}'::regclass AND contype='f' ORDER BY conname`,
    []
  );

  // Secuencias usadas por DEFAULT nextval('...') — deben crearse explícitamente
  for (const c of cols.rows) {
    const sm = c.column_default?.match(/nextval\('([^']+)'/);
    if (sm) sql += `CREATE SEQUENCE IF NOT EXISTS ${sm[1]};\n`;
  }
  if (cols.rows.some(c => c.column_default?.includes("nextval("))) sql += "\n";

  const colDefs = cols.rows.map(c => {
    let type = c.data_type;
    if (c.data_type === "character varying") type = `varchar(${c.character_maximum_length})`;
    if (c.data_type === "USER-DEFINED" || c.udt_name) type = c.udt_name;
    if (c.data_type === "numeric" && c.numeric_precision) type = "numeric";
    let def = `  "${c.column_name}" ${type}`;
    if (c.is_nullable === "NO") def += " NOT NULL";
    if (c.column_default) def += ` DEFAULT ${c.column_default}`;
    return def;
  });
  const pkCols = pk.rows.map(r => `"${r.attname}"`).join(", ");
  if (pkCols) colDefs.push(`  PRIMARY KEY (${pkCols})`);
  for (const u of uniques.rows) colDefs.push(`  ${u.def}`);
  for (const f of fks.rows) colDefs.push(`  ${f.def}`);

  sql += `-- ---------- ${t} ----------\n`;
  sql += `CREATE TABLE IF NOT EXISTS public.${t} (\n${colDefs.join(",\n")}\n);\n\n`;
}

// ---------- DATOS ----------
const DATA_TABLES = ["areas", "categorias", "configuracion", "perfiles", "activos"];
for (const t of DATA_TABLES) {
  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [t]
  );
  const colNames = cols.rows.map(c => c.column_name);
  const res = await client.query(`SELECT * FROM public.${t}`);
  if (res.rows.length === 0) continue;

  sql += `-- ---------- Datos: ${t} (${res.rows.length} filas) ----------\n`;
  const insert = `INSERT INTO public.${t} (${colNames.map(c => `"${c}"`).join(", ")}) VALUES\n`;
  const values = res.rows.map(row => {
    const vals = colNames.map(c => {
      const v = row[c];
      if (v === null) return "NULL";
      if (typeof v === "number") return String(v);
      if (v instanceof Date) return `'${v.toISOString()}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    return `(${vals.join(", ")})`;
  });
  sql += insert + values.join(",\n") + ";\n\n";
}

writeFileSync(join(__dirname, "..", "scripts", "supabase_dump.sql"), sql, "utf8");
console.log("Dump generado: scripts/supabase_dump.sql");
console.log("Tamaño:", (sql.length / 1024).toFixed(1), "KB");
await client.end();

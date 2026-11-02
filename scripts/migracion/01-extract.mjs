// 01-extract.mjs — Extrae todas las tablas de la BD actual (Supabase) a NDJSON + manifest.
// Uso:  node scripts/migracion/01-extract.mjs
// Lee DATABASE_URL de frontend/.env (la línea activa, igual que los demás scripts del repo).
// NO imprime credenciales.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT = join(__dirname, "dump");

export function leerUrl(nombre) {
  const envText = readFileSync(join(ROOT, "frontend", ".env"), "utf8");
  const lineas = envText
    .split(/\r?\n/)
    .filter((l) => l.startsWith(nombre + "="));
  if (lineas.length === 0) throw new Error(`Falta ${nombre}= en frontend/.env`);
  let url = lineas[lineas.length - 1].slice(nombre.length + 1).trim();
  url = url.replace(/^['"]|['"]$/g, "");
  // node-postgres no soporta channel_binding (SCRAM-SHA-256-PLUS): se descarta.
  const limpia = url.replace(/[?&]channel_binding=[^&]*/g, "");
  if (limpia !== url) console.log(`  · ${nombre}: channel_binding eliminado (no soportado por pg)`);
  return limpia;
}

/** Igual que leerUrl pero devuelve null si la variable no existe. */
export function leerUrlOpcional(nombre) {
  try {
    return leerUrl(nombre);
  } catch {
    return null;
  }
}

// Orden de dependencias (padres primero)
export const TABLAS = [
  "areas",
  "categorias",
  "configuracion",
  "perfiles",
  "activos",
  "prestamos",
  "detalles_prestamo",
  "registro_blockchain",
  "sesiones",
  "push_suscripciones",
];

export const PK = {
  areas: "id_area",
  categorias: "id_categoria",
  configuracion: "clave",
  perfiles: "id_perfil",
  activos: "id_activo",
  prestamos: "id_prestamo",
  detalles_prestamo: "id_detalle",
  registro_blockchain: "id_registro",
  sesiones: "sid",
  push_suscripciones: "id_suscripcion",
};

export function conectar(url) {
  const esNube = url.includes("supabase") || url.includes("neon.tech");
  const client = new pg.Client({
    connectionString: url,
    ssl: esNube ? { rejectUnauthorized: false } : undefined,
    statement_timeout: 60000,
  });
  return client;
}

// ───────────────────────────── ejecución ─────────────────────────────
if (process.argv[1] && process.argv[1].endsWith("01-extract.mjs")) {
  mkdirSync(OUT, { recursive: true });

  // Origen: ORIGEN_DATABASE_URL (solo si aún se quiere re-extraer del proveedor
  // anterior) o, por defecto, la base actual.
  const url = leerUrlOpcional("ORIGEN_DATABASE_URL") || leerUrl("DATABASE_URL");
  const host = url.replace(/^.*@/, "").split("/")[0];
  console.log(`Origen: ${host}`);

  const client = conectar(url);
  await client.connect();

  const manifest = { origen: host, generado: new Date().toISOString(), tablas: {} };

  for (const t of TABLAS) {
    try {
      // ORDER BY PK → dump determinista (permite comparar checksums después)
      const { rows } = await client.query(`SELECT * FROM "${t}" ORDER BY "${PK[t]}"`);
      const ndjson = rows.map((r) => JSON.stringify(r)).join("\n");
      writeFileSync(join(OUT, `${t}.ndjson`), ndjson);
      manifest.tablas[t] = {
        filas: rows.length,
        sha256: createHash("sha256").update(ndjson).digest("hex"),
      };
      console.log(`  ${t.padEnd(22)} ${String(rows.length).padStart(5)} filas`);
    } catch (e) {
      console.warn(`  ${t.padEnd(22)} OMITIDA — ${e.message}`);
      manifest.tablas[t] = { filas: 0, error: e.message };
    }
  }

  await client.end();
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nExtraído en ${OUT}`);
}

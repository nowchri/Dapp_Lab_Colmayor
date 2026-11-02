// 02-load.mjs — Crea el esquema en Neon y carga los NDJSON extraídos.
// Uso:  node scripts/migracion/02-load.mjs [--solo-esquema] [--solo-datos]
// Requiere NEON_DATABASE_URL= en frontend/.env
// Idempotente: el esquema usa IF NOT EXISTS y los INSERT usan ON CONFLICT DO NOTHING.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { leerUrl, TABLAS, PK, conectar } from "./01-extract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DUMP = join(__dirname, "dump");

const soloEsquema = process.argv.includes("--solo-esquema");
const soloDatos = process.argv.includes("--solo-datos");

if (!existsSync(join(DUMP, "manifest.json"))) {
  console.error("No hay dump. Ejecutá primero: node scripts/migracion/01-extract.mjs");
  process.exit(1);
}

const url = leerUrl("DATABASE_URL");
console.log(`Destino: ${url.replace(/^.*@/, "").split("/")[0]}`);

const client = conectar(url);
await client.connect();

// ── 1. Esquema ──
if (!soloDatos) {
  const ddl = readFileSync(join(__dirname, "00-schema.sql"), "utf8");
  // Se ejecuta sentencia por sentencia: en el pooler de Neon un multi-statement
  // explícito puede caer en una transacción implícita distinta de la esperada.
  // Las líneas de comentario se eliminan ANTES de partir, si no el bloque que
  // empieza con "-- Tabla X" se descartaría junto con su CREATE TABLE.
  const limpio = ddl
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  const sentencias = limpio
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const s of sentencias) {
    try {
      await client.query(s);
    } catch (e) {
      if (/already exists|duplicate_object/i.test(e.message)) continue;
      console.error("DDL falló:\n", s.slice(0, 200), "\n→", e.message);
      throw e;
    }
  }
  console.log("Esquema: OK");
}

// ── 2. Datos ──
if (!soloEsquema) {
  for (const t of TABLAS) {
    const file = join(DUMP, `${t}.ndjson`);
    if (!existsSync(file)) { console.log(`  ${t.padEnd(22)} (sin archivo)`); continue; }

    const texto = readFileSync(file, "utf8").trim();
    if (!texto) { console.log(`  ${t.padEnd(22)} 0 filas`); continue; }
    const filas = texto.split("\n").map((l) => JSON.parse(l));

    const cols = Object.keys(filas[0]);
    const colSql = cols.map((c) => `"${c}"`).join(", ");
    const porLote = Math.max(1, Math.floor(30000 / cols.length)); // < 65535 parámetros
    let insertadas = 0;

    for (let i = 0; i < filas.length; i += porLote) {
      const lote = filas.slice(i, i + porLote);
      const valores = [];
      let n = 1;
      const grupos = lote.map((fila) => {
        const marks = cols.map(() => `$${n++}`);
        valores.push(...cols.map((c) => (fila[c] === undefined ? null : fila[c])));
        return `(${marks.join(",")})`;
      });

      const sql = `INSERT INTO "${t}" (${colSql}) VALUES ${grupos.join(",")}
                   ON CONFLICT DO NOTHING`;
      const res = await client.query(sql, valores);
      insertadas += res.rowCount;
    }

    console.log(`  ${t.padEnd(22)} ${String(insertadas).padStart(5)} / ${filas.length} insertadas`);
    if (insertadas < filas.length) {
      console.log(`      ↳ ${filas.length - insertadas} ya existían (conflicto de PK/UNIQUE)`);
    }
  }

  // ── 3. Secuencia de la cadena ──
  const seq = await client.query(
    `SELECT setval('registro_blockchain_id_registro_seq',
                   COALESCE((SELECT MAX(id_registro) FROM registro_blockchain), 1),
                   (SELECT COUNT(*) > 0 FROM registro_blockchain)) AS v`
  );
  console.log(`Secuencia registro_blockchain: ${seq.rows[0].v}`);

  // ── 4. Contadores bigserial de push_suscripciones ──
  try {
    await client.query(
      `SELECT setval(pg_get_serial_sequence('push_suscripciones','id_suscripcion'),
                     COALESCE((SELECT MAX(id_suscripcion) FROM push_suscripciones), 1),
                     (SELECT COUNT(*) > 0 FROM push_suscripciones))`
    );
  } catch { /* tabla vacía o sin serial: irrelevante */ }
}

await client.end();
console.log("\nCarga terminada.");

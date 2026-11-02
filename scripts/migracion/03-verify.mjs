// 03-verify.mjs — Verifica la base destino (Neon).
//
// Dos modos:
//   1) CON origen  → si existe ORIGEN_DATABASE_URL en frontend/.env, compara
//      tabla por tabla con checksum del contenido completo (migración recién hecha).
//   2) SIN origen  → comprobación permanente contra el manifest del dump y
//      contra la integridad de la cadena. Sirve como verificación de rutina.
//
// Uso: node scripts/migracion/03-verify.mjs

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { leerUrl, leerUrlOpcional, TABLAS, PK, conectar } from "./01-extract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const hashFilas = (rows) =>
  createHash("sha256").update(rows.map((r) => JSON.stringify(r)).join("|")).digest("hex");

const origenUrl = leerUrlOpcional("ORIGEN_DATABASE_URL");
const destino = conectar(leerUrl("DATABASE_URL"));
await destino.connect();

let fallos = 0;
const manifestPath = join(__dirname, "dump", "manifest.json");
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { tablas: {} };

// ─────────────────────────── modo 1: comparación ───────────────────────────
if (origenUrl) {
  const origen = conectar(origenUrl);
  await origen.connect();

  console.log("COMPARACIÓN ORIGEN ↔ DESTINO (checksum del contenido)");
  console.log("TABLA                  ORIGEN  DESTINO  CONTENIDO");
  console.log("─".repeat(62));

  for (const t of TABLAS) {
    if (manifest.tablas[t]?.error) continue;
    let a, b;
    try {
      a = (await origen.query(`SELECT * FROM "${t}" ORDER BY "${PK[t]}"`)).rows;
      b = (await destino.query(`SELECT * FROM "${t}" ORDER BY "${PK[t]}"`)).rows;
    } catch (e) {
      console.log(`${t.padEnd(22)} ERROR: ${e.message}`);
      fallos++;
      continue;
    }

    const iguales = hashFilas(a) === hashFilas(b);
    const bien = a.length === b.length && iguales;
    if (!bien) fallos++;
    console.log(
      `${t.padEnd(22)} ${String(a.length).padStart(6)}  ${String(b.length).padStart(7)}  ${bien ? "✓ idéntico" : "✗ DIFIERE"}`
    );

    if (!iguales && a.length === b.length) {
      for (let i = 0; i < a.length; i++) {
        if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
          const ka = Object.keys(a[i]).filter(
            (k) => JSON.stringify(a[i][k]) !== JSON.stringify(b[i][k])
          );
          console.log(`    primera diferencia en ${PK[t]}=${a[i][PK[t]]} → campos: ${ka.join(", ")}`);
          for (const k of ka) {
            console.log(`      ${k}: origen=${JSON.stringify(a[i][k])} destino=${JSON.stringify(b[i][k])}`);
          }
          break;
        }
      }
    }
  }
  await origen.end();
} else {
  // ─────────────────────── modo 2: verificación de rutina ───────────────────────
  console.log("VERIFICACIÓN DE LA BASE ACTUAL (sin origen configurado)");
  console.log("TABLA                    FILAS  MANIFEST  ESTADO");
  console.log("─".repeat(56));

  for (const t of TABLAS) {
    const { rows } = await destino.query(`SELECT count(*)::int AS n FROM "${t}"`);
    const n = rows[0].n;
    const base = manifest.tablas[t]?.filas ?? null;
    // Las sesiones caducan y se limpian solas: su número no es comparable.
    const efimera = t === "sesiones";
    // Después de la migración las filas solo pueden crecer (préstamos nuevos);
    // si hay menos que en el dump, se perdió información.
    const ok = efimera || base === null || n >= base;
    if (!ok) fallos++;
    const estado = efimera ? "· efímera" : ok ? "✓" : "✗ faltan datos";
    console.log(
      `${t.padEnd(22)} ${String(n).padStart(6)}  ${String(base ?? "—").padStart(8)}  ${estado}`
    );
  }
}

// ─────────────────────────── integridad de la cadena ───────────────────────────
const cadena = (
  await destino.query(
    `SELECT id_registro, prev_hash, hash_registro FROM registro_blockchain ORDER BY id_registro ASC`
  )
).rows;

let roto = null;
for (let i = 0; i < cadena.length; i++) {
  const esperado = i === 0 ? null : cadena[i - 1].hash_registro;
  if (cadena[i].prev_hash !== esperado) { roto = cadena[i].id_registro; break; }
}

console.log("\nCADENA DE TRAZABILIDAD");
if (roto === null) {
  console.log(`  ✓ íntegra — ${cadena.length} eslabones encadenados correctamente`);
} else {
  console.log(`  ✗ rota en id_registro=${roto}`);
  fallos++;
}

// ─────────────────────────── secuencia y consulta real ───────────────────────────
const seq = await destino.query(`SELECT last_value FROM registro_blockchain_id_registro_seq`);
const max = await destino.query(`SELECT COALESCE(MAX(id_registro),0) AS m FROM registro_blockchain`);
const okSeq = Number(seq.rows[0].last_value) >= Number(max.rows[0].m);
console.log(
  `  ${okSeq ? "✓" : "✗"} secuencia: last_value=${seq.rows[0].last_value} · max(id_registro)=${max.rows[0].m}`
);
if (!okSeq) fallos++;

const inv = await destino.query(
  `SELECT count(*)::int AS n FROM activos a
   LEFT JOIN categorias c ON c.id_categoria = a.id_categoria
   LEFT JOIN areas ar ON ar.id_area = c.id_area
   WHERE a.id_activo_padre IS NULL`
);
console.log(`  ✓ inventario raíz (join triple): ${inv.rows[0].n} filas`);

await destino.end();
console.log(
  fallos === 0 ? "\nRESULTADO: VERIFICACIÓN OK ✓" : `\nRESULTADO: ${fallos} comprobación(es) fallaron ✗`
);
process.exit(fallos === 0 ? 0 : 1);

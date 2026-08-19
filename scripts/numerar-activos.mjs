// ============================================================
// Numeración de activos — agrega "#1, #2, ..." a los nombres
// Agrupa por nombre_activo y numera secuencialmente.
// Los grupos con 1 solo activo quedan sin sufijo.
// Orden por codigo_qr (contiene contador de inserción).
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ENV = join(__dirname, "..", "frontend", ".env");

const envText = readFileSync(FRONTEND_ENV, "utf8");
const m = envText.match(/DATABASE_URL=(.+)/);
if (!m) { console.error("No se encontró DATABASE_URL"); process.exit(1); }
const DATABASE_URL = m[1].trim();

const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  console.log("Conectado ✓");

  // Obtener todos los activos agrupados por nombre
  const res = await client.query(
    `SELECT id_activo, nombre_activo, codigo_qr
     FROM activos
     ORDER BY nombre_activo, codigo_qr`
  );

  // Agrupar por nombre
  const groups = {};
  for (const row of res.rows) {
    if (!groups[row.nombre_activo]) groups[row.nombre_activo] = [];
    groups[row.nombre_activo].push(row);
  }

  let renombrados = 0;
  let grupos = 0;

  for (const [nombre, items] of Object.entries(groups)) {
    // Si solo hay 1, no se numera (y no se le agrega "#1")
    if (items.length === 1) continue;

    grupos++;
    for (let i = 0; i < items.length; i++) {
      const nuevoNombre = `${nombre} #${i + 1}`;
      await client.query("UPDATE activos SET nombre_activo = $1 WHERE id_activo = $2", [nuevoNombre, items[i].id_activo]);
      renombrados++;
    }
    console.log(`✓ "${nombre}" ×${items.length} → #1 a #${items.length}`);
  }

  console.log("\n============================================");
  console.log(`✅ Numeración completa`);
  console.log(`   Grupos numerados: ${grupos}`);
  console.log(`   Activos renombrados: ${renombrados}`);
  console.log("============================================");

} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
} finally {
  await client.end();
}

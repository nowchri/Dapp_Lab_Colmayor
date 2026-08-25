// ============================================================
// Arreglo de nombres y QRs — corrige mangle de cleanName:
//   "Raspberryerry" → "Raspberry", "Arduinoino" → "Arduino",
//   "Modulo" → "Módulo", "Multimetro" → "Multímetro", etc.
// Regenera codigo_qr desde el nombre corregido, conservando
// el timestamp único (segmento tras el último "-").
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

const FIXES = [
  ["Raspberryerry", "Raspberry"],
  ["Arduinoino", "Arduino"],
  ["Modulo", "Módulo"],
  ["Multimetro", "Multímetro"],
  ["Analogico", "Analógico"],
  ["Micrometrico", "Micrométrico"],
  ["Ultrasonico", "Ultrasónico"],
  ["Rejistro", "Registro"],
  ["Electro", "Eléctrico"],
];

const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  console.log("Conectado ✓");

  // 1. Corregir nombres
  let renamed = 0;
  for (const [bad, good] of FIXES) {
    const res = await client.query(
      "UPDATE activos SET nombre_activo = REPLACE(nombre_activo, $1, $2) WHERE nombre_activo LIKE '%' || $1 || '%'",
      [bad, good]
    );
    if (res.rowCount > 0) { renamed += res.rowCount; console.log(`✓ ${bad} → ${good} (${res.rowCount})`); }
  }

  // 2. Regenerar QR conservando el timestamp final
  const rows = await client.query(
    "SELECT id_activo, nombre_activo, codigo_qr FROM activos WHERE codigo_qr IS NOT NULL"
  );
  let qrFixed = 0;
  for (const a of rows.rows) {
    const base = a.nombre_activo.replace(/\s*#\d+\s*$/, "").toUpperCase().replace(/\s+/g, "-").slice(0, 30);
    const ts = a.codigo_qr.split("-").pop();
    const nuevo = "QR-" + base + "-" + ts;
    if (nuevo !== a.codigo_qr) {
      await client.query("UPDATE activos SET codigo_qr = $1 WHERE id_activo = $2", [nuevo, a.id_activo]);
      qrFixed++;
    }
  }

  console.log(`\nNombres corregidos: ${renamed}`);
  console.log(`QRs regenerados:   ${qrFixed}`);

  // 3. Verificación: nombres con patrones raros
  const weird = await client.query(
    `SELECT nombre_activo, count(*) FROM activos
     WHERE nombre_activo ~ 'erry|ino$|^Modulo|ultimetro|nalogico|icro|ltra'
     GROUP BY nombre_activo`
  );
  if (weird.rows.length > 0) {
    console.log("\n⚠️  Aún raros:");
    for (const w of weird.rows) console.log("  -", w.nombre_activo, `(${w.count})`);
  } else {
    console.log("\n✅ Sin nombres raros restantes");
  }

  // Muestra de ejemplo
  const sample = await client.query(
    "SELECT nombre_activo, codigo_qr FROM activos WHERE nombre_activo LIKE 'Tarjetas Raspberry%' ORDER BY codigo_qr LIMIT 3"
  );
  for (const s of sample.rows) console.log("  ej:", s.nombre_activo, "→", s.codigo_qr);

} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
} finally {
  await client.end();
}

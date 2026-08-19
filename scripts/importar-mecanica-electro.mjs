// ============================================================
// Importación de inventario — Mecánica y Electromagnetismo (Lab IUCMC)
// Opción A: script aparte en /scripts (no toca la app Next.js)
//
// Uso:  node scripts/importar-mecanica-electro.mjs
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ENV = join(__dirname, "..", "frontend", ".env");

const envText = readFileSync(FRONTEND_ENV, "utf8");
const m = envText.match(/DATABASE_URL=(.+)/);
if (!m) { console.error("No se encontró DATABASE_URL en frontend/.env"); process.exit(1); }
const DATABASE_URL = m[1].trim();

// ------------------------------------------------------------
// [codigoExcel, nombreLimpio, categoria, cantidadDisponible, cantidadDanado]
// ------------------------------------------------------------
const ITEMS = [
  // ─── Electricidad y electromagnetismo ───
  ["GVGRAF", "Generador de Van der Graaff", "Electricidad y electromagnetismo", 1, 0],
  ["BDH", "Bobinas de Helmholtz", "Electricidad y electromagnetismo", 1, 0],
  ["TABLEL", "Tablero de Electricidad", "Electricidad y electromagnetismo", 1, 0],
  ["CPE", "Cubeta y Placas de Electrólisis", "Electricidad y electromagnetismo", 1, 0],
  ["IMAN1", "Imán Tipo U Rojo", "Electricidad y electromagnetismo", 1, 0],
  ["IMAN2", "Imán Dos Trozos en U Metálico", "Electricidad y electromagnetismo", 1, 0],
  ["IMAN3", "Imán Tipo Dona", "Electricidad y electromagnetismo", 1, 0],
  ["KITELECTR", "Kit de Electrización de Cuerpos", "Electricidad y electromagnetismo", 1, 0],
  ["KITTRA", "Kit para Armado de Transformador", "Electricidad y electromagnetismo", 1, 0],
  ["RHEOST", "Resistencia de Alambre Variable", "Electricidad y electromagnetismo", 1, 0],
  ["TIMBR", "Timbre Eléctrico", "Electricidad y electromagnetismo", 1, 0],
  ["FILAM", "Tarros de Filamento de Hierro", "Electricidad y electromagnetismo", 2, 0],
  ["CCRES", "Caja de Cables de Resistencia", "Electricidad y electromagnetismo", 1, 0],

  // ─── Instrumentos de medición ───
  ["GMECA", "Gramera Mecánica", "Instrumentos de medición", 1, 2],
  ["GDIGI", "Gramera Digital", "Instrumentos de medición", 2, 0],
  ["OSCI", "Osciloscopio Tectronix", "Instrumentos de medición", 1, 0],
  ["GSEÑA", "Generador de Señal Tectronix", "Instrumentos de medición", 2, 0],
  ["TORMICR", "Tornillo Micrométrico", "Instrumentos de medición", 6, 0],
  ["CALVER", "Calibrador Vernier", "Instrumentos de medición", 5, 0],
  ["BRUJU", "Brújula", "Instrumentos de medición", 5, 0],
  ["MAQU", "Máquina de Registro de Tiempo", "Instrumentos de medición", 2, 0],
  ["CALLOR", "Calorímetro", "Instrumentos de medición", 1, 0],
  ["KCTEM", "Tubo de Líquido Térmico", "Instrumentos de medición", 2, 0],
  ["CONDIN", "Dinamómetro", "Instrumentos de medición", 9, 0],

  // ─── Kits ───
  ["KMFC", "Kit Mesa de Fuerzas Coplanares", "Kits", 2, 0],
  ["KLLA", "Kit de Llaves Locker Azules", "Kits", 1, 0],
  ["KITPEN", "Kit de Péndulo", "Kits", 3, 0],
  ["ARKIT", "Kit de Aro Metálico y Poleas", "Kits", 2, 0],
  ["PLAINCL", "Kit de Planos Inclinados", "Kits", 2, 0],
  ["BALAPOL", "Kit de Balanzas con Poleas", "Kits", 2, 0],
  ["CAUTI", "Kit de Soldadura", "Kits", 2, 0],
  ["PINZCA", "Kit de Pinzas de Cableado", "Kits", 6, 0],

  // ─── Mecánica y fuerzas ───
  ["BATRM", "Base Triangular Metálica", "Mecánica y fuerzas", 7, 0],
  ["PINZ", "Pinza Nuez Diversa", "Mecánica y fuerzas", 9, 0],
  ["BOLMA", "Bola de Madera", "Mecánica y fuerzas", 4, 0],
  ["CARMOV", "Carrito Móvil de Plástico", "Mecánica y fuerzas", 4, 0],
  ["MESOCA", "Mesa Soporte de Cautín", "Mecánica y fuerzas", 6, 0],
  ["MESPLSO", "Mesa de Protección Plástica", "Mecánica y fuerzas", 6, 0],
  ["BRAAYU", "Brazo Ayudante para Soldar", "Mecánica y fuerzas", 6, 0],
  ["PCENK", "Plancha Calentadora Enkor", "Mecánica y fuerzas", 1, 0],
  ["CAHERR", "Caja de Herramientas", "Mecánica y fuerzas", 6, 0],

  // ─── Otros materiales ───
  ["PEPSON", "Proyector Epson", "Otros materiales", 1, 0],
  ["CEPSON", "Control Proyector Epson", "Otros materiales", 1, 0],
  ["BICPLA", "Beaker Plástico", "Otros materiales", 3, 0],
  ["BICVID", "Beaker de Vidrio", "Otros materiales", 1, 0],
];

function generateQR(nombre, counter) {
  const base = nombre.toUpperCase().replace(/\s+/g, "-").slice(0, 30);
  const ts = (Date.now() + counter).toString(36).toUpperCase();
  return "QR-" + base + "-" + ts;
}

const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  console.log("Conectado a PostgreSQL ✓");

  const areaRes = await client.query(
    "SELECT id_area FROM areas WHERE nombre_area = 'Mecánica y Electromagnetismo'"
  );
  if (areaRes.rows.length === 0) {
    throw new Error("Área 'Mecánica y Electromagnetismo' no existe");
  }
  const idArea = areaRes.rows[0].id_area;

  const catRes = await client.query(
    "SELECT id_categoria, nombre_categoria FROM categorias WHERE id_area = $1",
    [idArea]
  );
  const catMap = {};
  for (const c of catRes.rows) catMap[c.nombre_categoria] = c.id_categoria;

  let counter = 0;
  let totalDisp = 0;
  let totalDan = 0;

  for (const [codigo, nombre, categoria, disp, dan] of ITEMS) {
    const idCat = catMap[categoria];
    if (!idCat) {
      console.error(`⚠️ Categoría no encontrada: ${categoria} (para ${codigo})`);
      continue;
    }

    // Disponibles
    for (let i = 0; i < disp; i++) {
      const qr = generateQR(nombre, counter++);
      await client.query(
        `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, tipo, estado)
         VALUES ($1, $2, $3, 'trazable', 'disponible')`,
        [qr, nombre, idCat]
      );
      totalDisp++;
    }

    // Dañados
    for (let i = 0; i < dan; i++) {
      await client.query(
        `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, tipo, estado, observaciones_iniciales)
         VALUES (NULL, $1, $2, 'trazable', 'dañado', 'Dañado según inventario físico')`,
        [nombre, idCat]
      );
      totalDan++;
    }

    const label = dan > 0 ? `${disp} disp + ${dan} dañado` : `${disp} unidades`;
    console.log(`✓ ${codigo} (${categoria}): ${label}`);
  }

  const total = await client.query("SELECT count(*) FROM activos");
  console.log("\n============================================");
  console.log(`✅ Importación Mecánica-Electro completa`);
  console.log(`   Disponibles: ${totalDisp}`);
  console.log(`   Dañados:     ${totalDan}`);
  console.log(`   Total activos en BD: ${total.rows[0].count}`);
  console.log("============================================");

} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
} finally {
  await client.end();
}

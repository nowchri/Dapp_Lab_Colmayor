// ============================================================
// Importación de inventario v2 — lee los CSVs actualizados
// (Sistemas Embebidos + Mecánica y Electromagnetismo)
//
// Reglas:
//  - Trazable  → N unidades individuales con QR (Cant. Inicial)
//  - Consumible → 1 registro con stock_actual = Cant. Inicial (sin QR)
//  - "no subir" → se omite
//  - Cant. Inicial = 0 → se omite
//  - Se ignoran las secciones DAÑADOS / PRESTAMOS del CSV
//
// Uso: node scripts/importar-csv-v2.mjs
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ENV = join(__dirname, "..", "frontend", ".env");

const envText = readFileSync(FRONTEND_ENV, "utf8");
const m = envText.match(/DATABASE_URL=(.+)/);
if (!m) { console.error("No se encontró DATABASE_URL en frontend/.env"); process.exit(1); }
const DATABASE_URL = m[1].trim();

const ATTACH_DIR = join(__dirname, "..", ".hermes", "desktop-attachments");
const CSV1 = join(ATTACH_DIR, "1_INVENTARIO_MONITORIA_Actualizada_Sistemas embebidos-2.csv");
const CSV2 = join(ATTACH_DIR, "2_INVENTARIO_MONITORIA_Actualizada_Mecanica-Electro-3.csv");

// ------------------------------------------------------------
// Mapeo codigoExcel -> categoria (nombres exactos en la BD)
// ------------------------------------------------------------
const CAT_MAP = {
  // ─── Sistemas Embebidos ───
  KITARD: "Kits", KITSEN: "Kits", CHASK: "Kits", CHASB: "Kits", KITBEB: "Kits", RFID: "Kits",
  TRASP3: "Tarjetas y módulos", TARESP: "Tarjetas y módulos", ARYUN: "Tarjetas y módulos",
  ARMKR: "Tarjetas y módulos", ARNAN: "Tarjetas y módulos", MEGA: "Tarjetas y módulos",
  MODBT: "Tarjetas y módulos", MODWI: "Tarjetas y módulos", RELOJ: "Tarjetas y módulos",
  PIR: "Sensores y actuadores", ULTRA: "Sensores y actuadores", SECAP: "Sensores y actuadores",
  SER90: "Sensores y actuadores", MATRI: "Sensores y actuadores", CONTR: "Sensores y actuadores",
  "5611BH": "Sensores y actuadores", "HS-3612": "Sensores y actuadores", "YL-83": "Sensores y actuadores",
  TEMO: "Periféricos y alimentación", ARSPB: "Periféricos y alimentación", CRASPB: "Periféricos y alimentación",
  MOURAS: "Periféricos y alimentación", PANTAC: "Periféricos y alimentación", FUEMB: "Periféricos y alimentación",
  FUENP: "Periféricos y alimentación", ADAAR: "Periféricos y alimentación", TECLA: "Periféricos y alimentación",
  TMICSD: "Electrónica y componentes", LM25: "Electrónica y componentes", PROTOM: "Electrónica y componentes",
  PROTOG: "Electrónica y componentes", CADES: "Electrónica y componentes", ADAPMICROSD: "Electrónica y componentes",
  "UT-139C": "Electrónica y componentes", "UT-204A": "Electrónica y componentes", "UT-33": "Electrónica y componentes",
  "YX-360": "Electrónica y componentes", DCA75: "Electrónica y componentes", "TM-203": "Electrónica y componentes",
  "M-830B": "Electrónica y componentes", DM230C: "Electrónica y componentes", UT139B: "Electrónica y componentes",
  "UT-382": "Electrónica y componentes", CABLE: "Electrónica y componentes", CAMEG: "Electrónica y componentes",
  DISRASPB: "Electrónica y componentes", HEATSINK: "Electrónica y componentes", POTN: "Electrónica y componentes",
  KEYCAPS: "Electrónica y componentes",

  // ─── Mecánica y Electromagnetismo ───
  GVGRAF: "Electricidad y electromagnetismo", BDH: "Electricidad y electromagnetismo",
  TABLEL: "Electricidad y electromagnetismo", CPE: "Electricidad y electromagnetismo",
  IMAN1: "Electricidad y electromagnetismo", IMAN2: "Electricidad y electromagnetismo",
  IMAN3: "Electricidad y electromagnetismo", KITELECTR: "Electricidad y electromagnetismo",
  KITTRA: "Electricidad y electromagnetismo", RHEOST: "Electricidad y electromagnetismo",
  TIMBR: "Electricidad y electromagnetismo", FILAM: "Electricidad y electromagnetismo",
  CCRES: "Electricidad y electromagnetismo", CUTP: "Electricidad y electromagnetismo",
  EXT3TMAS: "Electricidad y electromagnetismo", VGA: "Electricidad y electromagnetismo",
  HDMI: "Electricidad y electromagnetismo", MABOA: "Electricidad y electromagnetismo",
  GMECA: "Instrumentos de medición", GDIGI: "Instrumentos de medición", OSCI: "Instrumentos de medición",
  GSEÑA: "Instrumentos de medición", TORMICR: "Instrumentos de medición", CALVER: "Instrumentos de medición",
  BRUJU: "Instrumentos de medición", MAQU: "Instrumentos de medición", CALLOR: "Instrumentos de medición",
  KCTEM: "Instrumentos de medición", CONDIN: "Instrumentos de medición", CRONO: "Instrumentos de medición",
  CINMETR: "Instrumentos de medición", METR: "Instrumentos de medición",
  KMFC: "Kits", KITPEN: "Kits", ARKIT: "Kits", PLAINCL: "Kits", BALAPOL: "Kits",
  CAUTI: "Kits", PINZCA: "Kits",
  BATRM: "Mecánica y fuerzas", PINZ: "Mecánica y fuerzas", BOLMA: "Mecánica y fuerzas",
  CARMOV: "Mecánica y fuerzas", MESOCA: "Mecánica y fuerzas", MESPLSO: "Mecánica y fuerzas",
  BRAAYU: "Mecánica y fuerzas", PCENK: "Mecánica y fuerzas", CAHERR: "Mecánica y fuerzas",
  PESA1: "Mecánica y fuerzas", PESA2: "Mecánica y fuerzas", PESA3: "Mecánica y fuerzas",
  PESA4: "Mecánica y fuerzas", PESA5: "Mecánica y fuerzas", PESA6: "Mecánica y fuerzas",
  BOLCRI: "Mecánica y fuerzas", PIMPO: "Mecánica y fuerzas", FIGUG: "Mecánica y fuerzas",
  TBS: "Mecánica y fuerzas",
  PEPSON: "Otros materiales", CEPSON: "Otros materiales", BICPLA: "Otros materiales",
  BICVID: "Otros materiales", TUBEN: "Otros materiales",
};

// RFID: cada kit tiene 3 hijos (lector, llavero, carnet)
const RFID_KITS = 10;
const RFID_CHILDREN = ["Lector RFID", "Llavero RFID", "Carnet RFID"];

// ------------------------------------------------------------
// Limpieza de nombres: title case + correcciones comunes
// ------------------------------------------------------------
function cleanName(s) {
  let n = s.trim().replace(/\s+/g, " ");
  n = n.toLowerCase().replace(/(^|\s)([a-zñ0-9])/g, (_, pre, ch) => pre + ch.toUpperCase());
  const fixes = [
    [/\braspb\b/gi, "Raspberry"], [/\bardu\b/gi, "Arduino"], [/tactil/gi, "Táctil"],
    [/numericos/gi, "Numéricos"], [/tecnicos/gi, "Técnicos"], [/\b2wd\b/gi, "2WD"],
    [/\bhc-06\b/gi, "HC-06"], [/\besp8266\b/gi, "ESP8266"], [/\bmp3\b/gi, "MP3"],
    [/\biot\b/gi, "IoT"], [/\bsg90\b/gi, "SG90"], [/\butp\b/gi, "UTP"],
    [/\bvga\b/gi, "VGA"], [/\bhdmi\b/gi, "HDMI"], [/\bbt\b/gi, "BT"],
    [/\bsd\b/gi, "SD"], [/\bpi\b/gi, "Pi"], [/\bmkr\b/gi, "MKR"],
    [/\bled\b/gi, "LED"], [/\b16gb\b/gi, "16GB"], [/\brfid\b/gi, "RFID"],
    [/\bfc-37\b/gi, "FC-37"], [/\blm2596\b/gi, "LM2596"], [/\bmb102\b/gi, "MB102"],
    [/\b3\.3-5v\b/gi, "3.3-5V"], [/\byun\b/gi, "Yun"], [/\bnano\b/gi, "Nano"],
    [/\bmega\b/gi, "Mega"], [/\buno\b/gi, "Uno"],
    [/multimetro/gi, "Multímetro"], [/analogico/gi, "Analógico"],
    [/micrometrico/gi, "Micrométrico"], [/ultrasonico/gi, "Ultrasónico"],
    [/\bearduino\b/gi, "Arduino"], [/\bteclas\b/gi, "Teclas"], [/\bip\b/gi, "IP"],
  ];
  for (const [re, rep] of fixes) n = n.replace(re, rep);
  return n.replace(/\.\s*$/g, "").trim();
}

function generateQR(nombre, counter) {
  const base = nombre.toUpperCase().replace(/\s+/g, "-").slice(0, 30);
  const ts = (Date.now() + counter).toString(36).toUpperCase();
  return "QR-" + base + "-" + ts;
}

// ------------------------------------------------------------
// Leer CSV (UTF-8 con BOM, separado por ;)
// ------------------------------------------------------------
async function readCsvRows(filePath) {
  const text = await readFile(filePath, "utf8");
  const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
  return rows.map(line => line.split(";").map(c => c.trim()));
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  console.log("Conectado a PostgreSQL ✓\n");

  const areasRes = await client.query("SELECT id_area, nombre_area FROM areas");
  const areaMap = {};
  for (const r of areasRes.rows) areaMap[r.nombre_area] = r.id_area;

  const catRes = await client.query("SELECT id_categoria, nombre_categoria, id_area FROM categorias");
  // Clave compuesta area|categoria — evita colisiones (hay 2 categorias llamadas "Kits")
  const catIdByName = {};
  for (const c of catRes.rows) {
    catIdByName[c.nombre_categoria] = catIdByName[c.nombre_categoria] || {};
    catIdByName[c.nombre_categoria][c.id_area] = c.id_categoria;
  }
  const getCatId = (nombre, idArea) => (catIdByName[nombre] || {})[idArea];

  // ── Configuración por archivo: [path, nombreArea, columnaTipo] ──
  const files = [
    { path: CSV1, area: "Sistemas Embebidos", tipoIdx: 6 },
    { path: CSV2, area: "Mecánica y Electromagnetismo", tipoIdx: 7 },
  ];

  let totalTrazables = 0;
  let totalConsumibles = 0;
  let totalKitsRFID = 0;
  let totalHijos = 0;
  let counter = 0;
  const omitidos = [];

  for (const file of files) {
    const idArea = areaMap[file.area];
    const rows = await readCsvRows(file.path);
    console.log(`\n──────── ${file.area} (${rows.length - 2} filas de datos) ────────`);

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const codigo = (row[0] || "").trim();
      const desc = (row[1] || "").trim();
      const cant = parseInt(row[2] || "0", 10) || 0;
      const tipo = (row[file.tipoIdx] || "").trim().toLowerCase();

      // Fila vacía o totales al final
      if (!codigo && !desc) continue;
      if (!codigo) continue;

      const categoria = CAT_MAP[codigo];

      // Reglas de omisión
      if (tipo.includes("no subir")) { omitidos.push(`${codigo} (${desc}) — dice 'no subir'`); continue; }
      if (cant <= 0) { omitidos.push(`${codigo} (${desc}) — Cant. Inicial 0`); continue; }
      if (!categoria) { omitidos.push(`${codigo} (${desc}) — sin mapeo de categoría`); continue; }

      const idCat = getCatId(categoria, idArea);
      const nombre = cleanName(desc);

      if (tipo.startsWith("traza")) {
        // Trazable: N unidades individuales con QR
        if (codigo === "RFID") {
          for (let k = 0; k < RFID_KITS; k++) {
            const qr = generateQR("Kit RFID", counter++);
            const kitRes = await client.query(
              `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, tipo, estado)
               VALUES ($1, $2, $3, 'trazable', 'disponible') RETURNING id_activo`,
              [qr, "Kit RFID", idCat]
            );
            totalKitsRFID++;
            for (const childName of RFID_CHILDREN) {
              await client.query(
                `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, id_activo_padre, tipo, estado)
                 VALUES (NULL, $1, NULL, $2, 'trazable', 'disponible')`,
                [childName, kitRes.rows[0].id_activo]
              );
              totalHijos++;
            }
          }
          console.log(`✓ RFID (Kits): ${RFID_KITS} kits × 3 hijos`);
        } else {
          for (let i = 0; i < cant; i++) {
            const qr = generateQR(nombre, counter++);
            await client.query(
              `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, tipo, estado)
               VALUES ($1, $2, $3, 'trazable', 'disponible')`,
              [qr, nombre, idCat]
            );
          }
          totalTrazables += cant;
          console.log(`✓ ${codigo} (${categoria}): ${cant} trazables con QR`);
        }
      } else if (tipo.startsWith("consu")) {
        // Consumible: 1 registro con stock
        await client.query(
          `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, tipo, estado, stock_actual)
           VALUES (NULL, $1, $2, 'consumible', 'disponible', $3)`,
          [nombre, idCat, cant]
        );
        totalConsumibles++;
        console.log(`✓ ${codigo} (${categoria}): consumible, stock ${cant}`);
      } else {
        omitidos.push(`${codigo} (${desc}) — tipo desconocido: '${tipo}'`);
      }
    }
  }

  console.log("\n============================================");
  console.log("✅ Importación completa");
  console.log(`   Trazables individuales:  ${totalTrazables}`);
  console.log(`   Consumibles (stock):     ${totalConsumibles}`);
  console.log(`   Kits RFID:               ${totalKitsRFID} (+${totalHijos} hijos)`);
  if (omitidos.length > 0) {
    console.log(`\n⚠️  Omitidos (${omitidos.length}):`);
    for (const o of omitidos) console.log(`   - ${o}`);
  }
  const total = await client.query("SELECT count(*) FROM activos");
  console.log(`\n   Total activos en BD: ${total.rows[0].count}`);
  console.log("============================================");

} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
} finally {
  await client.end();
}

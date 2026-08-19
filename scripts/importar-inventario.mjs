// ============================================================
// Importación de inventario — Sistemas Embebidos (Lab IUCMC)
// Opción A: script aparte en /scripts (no toca la app Next.js)
//
// Uso:  node scripts/importar-inventario.mjs
// Lee DATABASE_URL desde frontend/.env
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ENV = join(__dirname, "..", "frontend", ".env");

// Cargar DATABASE_URL desde .env
const envText = readFileSync(FRONTEND_ENV, "utf8");
const m = envText.match(/DATABASE_URL=(.+)/);
if (!m) { console.error("No se encontró DATABASE_URL en frontend/.env"); process.exit(1); }
const DATABASE_URL = m[1].trim();

// ------------------------------------------------------------
// Datos del inventario (ya limpios y verificados con el usuario)
// Solo "Cant. Actual.bien" — sin cables, disipadores, teclas,
// cargador, potenciómetro, dañados ni prestados.
// ------------------------------------------------------------

// [codigoExcel, nombreLimpio, categoria, cantidad]
const ITEMS = [
  // ─── Kits ───
  ["KITARD", "Kit Arduino Uno", "Kits", 22],
  ["KITSEN", "Kit 37 Sensores Arduino", "Kits", 23],
  ["CHASK", "Kit Chasis Carro 2WD", "Kits", 5],
  ["CHASB", "Kit Chasis Brazo Robótico", "Kits", 6],
  ["KITBEB", "Kit IoT BeagleBone", "Kits", 1],
  // RFID se maneja aparte (tiene hijos)

  // ─── Tarjetas y módulos ───
  ["TRASP3", "Raspberry Pi 3", "Tarjetas y módulos", 14],
  ["TARESP", "Tarjeta ESP32", "Tarjetas y módulos", 1],
  ["ARYUN", "Arduino Yun", "Tarjetas y módulos", 2],
  ["ARMKR", "Arduino MKR WiFi 1010", "Tarjetas y módulos", 2],
  ["ARNAN", "Arduino Nano", "Tarjetas y módulos", 8],
  ["MEGA", "Arduino Mega", "Tarjetas y módulos", 4],
  ["MODBT", "Módulo Bluetooth HC-06", "Tarjetas y módulos", 23],
  ["MODWI", "Módulo WiFi ESP8266", "Tarjetas y módulos", 24],
  ["RELOJ", "Módulo Reloj Arduino", "Tarjetas y módulos", 3],

  // ─── Sensores y actuadores ───
  ["PIR", "Sensor PIR", "Sensores y actuadores", 14],
  ["ULTRA", "Sensor Ultrasónico", "Sensores y actuadores", 7],
  ["SECAP", "Sensor Capacitive Touch", "Sensores y actuadores", 3],
  ["SER90", "Servomotor SG90", "Sensores y actuadores", 14],
  ["MATRI", "Matriz de Pantalla LED", "Sensores y actuadores", 5],
  ["CONTR", "Control Car MP3", "Sensores y actuadores", 5],
  ["5611BH", "Display Siete Segmentos", "Sensores y actuadores", 6],
  ["HS-3612", "Zumbador / Buzzer", "Sensores y actuadores", 1],
  ["YL-83", "Sensor de Lluvia FC-37", "Sensores y actuadores", 1],

  // ─── Periféricos y alimentación ───
  ["TEMO", "Teclado Raspberry", "Periféricos y alimentación", 14],
  ["ARSPB", "Adaptador Raspberry", "Periféricos y alimentación", 8],
  ["CRASPB", "Caja de Protección Raspberry", "Periféricos y alimentación", 14],
  ["MOURAS", "Mouse Raspberry", "Periféricos y alimentación", 11],
  ["PANTAC", "Pantalla Táctil Raspberry", "Periféricos y alimentación", 15],
  ["FUEMB", "Fuente MB102 3.3-5v", "Periféricos y alimentación", 22],
  ["FUENP", "Fuente de Voltaje", "Periféricos y alimentación", 5],
  ["ADAAR", "Adaptador Arduino", "Periféricos y alimentación", 17],
  ["TECLA", "Teclado Numérico Arduino", "Periféricos y alimentación", 4],

  // ─── Electrónica y componentes ───
  ["TMICSD", "Tarjeta Micro SD 16GB", "Electrónica y componentes", 4],
  ["LM25", "Regulador LM2596 Display", "Electrónica y componentes", 13],
  ["PROTOM", "Protoboard Mediana", "Electrónica y componentes", 13],
  ["PROTOG", "Protoboard Grande", "Electrónica y componentes", 1],
  ["CADES", "Caja de Destornilladores", "Electrónica y componentes", 2],
  ["ADAPMICROSD", "Adaptador de Tarjetas SD", "Electrónica y componentes", 6],
  ["UT-139C", "Multímetro Digital Grande", "Electrónica y componentes", 2],
  ["UT-204A", "Multímetro Digital", "Electrónica y componentes", 2],
  ["UT-33", "Multímetro Digital Pequeño", "Electrónica y componentes", 1],
  ["YX-360", "Multímetro Analógico", "Electrónica y componentes", 2],
  ["DCA75", "Medidor de Semiconductores", "Electrónica y componentes", 1],
  ["TM-203", "Multímetro Analógico", "Electrónica y componentes", 1],
  ["M-830B", "Multímetro Digital Pequeño", "Electrónica y componentes", 1],
  ["DM230C", "Multímetro Digital Grande", "Electrónica y componentes", 1],
  ["UT139B", "Multímetro Digital", "Electrónica y componentes", 1],
  ["UT-382", "Luxómetro", "Electrónica y componentes", 1],
];

// RFID: 10 kits, cada uno con 3 hijos (lector, llavero, carnet)
const RFID_KITS = 10;
const RFID_CHILDREN = ["Lector RFID", "Llavero RFID", "Carnet RFID"];

// ------------------------------------------------------------
// Generar QR con el formato del sistema: QR-NOMBRE-TIMESTAMP
// ------------------------------------------------------------
function generateQR(nombre, counter) {
  const base = nombre.toUpperCase().replace(/\s+/g, "-").slice(0, 30);
  const ts = (Date.now() + counter).toString(36).toUpperCase();
  return "QR-" + base + "-" + ts;
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  console.log("Conectado a PostgreSQL ✓");

  // Obtener id_area de "Sistemas Embebidos"
  const areaRes = await client.query(
    "SELECT id_area FROM areas WHERE nombre_area = 'Sistemas Embebidos'"
  );
  if (areaRes.rows.length === 0) {
    throw new Error("Área 'Sistemas Embebidos' no existe en la BD");
  }
  const idArea = areaRes.rows[0].id_area;

  // Cache de categorías
  const catRes = await client.query(
    "SELECT id_categoria, nombre_categoria FROM categorias WHERE id_area = $1",
    [idArea]
  );
  const catMap = {};
  for (const c of catRes.rows) catMap[c.nombre_categoria] = c.id_categoria;

  let counter = 0;
  let totalCreados = 0;
  let totalKits = 0;
  let totalHijos = 0;

  // 1. Items normales
  for (const [codigo, nombre, categoria, cantidad] of ITEMS) {
    const idCat = catMap[categoria];
    if (!idCat) {
      console.error(`⚠️ Categoría no encontrada: ${categoria} (para ${codigo})`);
      continue;
    }

    for (let i = 0; i < cantidad; i++) {
      const qr = generateQR(nombre, counter++);
      await client.query(
        `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, tipo, estado)
         VALUES ($1, $2, $3, 'trazable', 'disponible')`,
        [qr, nombre, idCat]
      );
      totalCreados++;
    }
    console.log(`✓ ${codigo} (${categoria}): ${cantidad} unidades`);
  }

  // 2. RFID: kits con hijos
  const idCatKits = catMap["Kits"];
  for (let k = 0; k < RFID_KITS; k++) {
    const qr = generateQR("Kit RFID", counter++);
    const kitRes = await client.query(
      `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, tipo, estado)
       VALUES ($1, $2, $3, 'trazable', 'disponible') RETURNING id_activo`,
      [qr, "Kit RFID", idCatKits]
    );
    const kitId = kitRes.rows[0].id_activo;
    totalKits++;

    for (const childName of RFID_CHILDREN) {
      await client.query(
        `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, id_activo_padre, tipo, estado)
         VALUES (NULL, $1, NULL, $2, 'trazable', 'disponible')`,
        [childName, kitId]
      );
      totalHijos++;
    }
  }
  console.log(`✓ RFID: ${RFID_KITS} kits + ${totalHijos} hijos (lector/llavero/carnet)`);

  // Resumen final
  const total = await client.query("SELECT count(*) FROM activos WHERE id_activo_padre IS NULL");
  const hijos = await client.query("SELECT count(*) FROM activos WHERE id_activo_padre IS NOT NULL");

  console.log("\n============================================");
  console.log(`✅ Importación completa`);
  console.log(`   Activos independientes (con QR): ${total.rows[0].count}`);
  console.log(`   Hijos de kit (sin QR):           ${hijos.rows[0].count}`);
  console.log(`   Total activos:                   ${Number(total.rows[0].count) + Number(hijos.rows[0].count)}`);
  console.log("============================================");

} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
} finally {
  await client.end();
}

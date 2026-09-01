// Genera íconos PWA (192, 512, maskable) — PNG válidos sin dependencias.
// Dibuja un cuadrado azul institucional #09488D con una "L" amarilla #F7C800.
import zlib from "zlib";
import { writeFileSync, mkdirSync } from "fs";

const AZUL = [9, 72, 141];      // #09488D
const AMARILLO = [247, 200, 0]; // #F7C800
const BLANCO = [255, 255, 255];

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, maskable = false) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const lw = size * 0.16; // grosor de la L
  // Área segura (80% para maskable)
  const safe = maskable ? 0.8 : 1;
  const s0 = size * (1 - safe) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = AZUL;
      // Fondo: azul institucional con leve degradado radial
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (size * 0.72);
      if (d < 1) color = [
        Math.round(AZUL[0] * (1 - d * 0.25)),
        Math.round(AZUL[1] * (1 - d * 0.25)),
        Math.round(AZUL[2] * (1 - d * 0.25)),
      ];
      // La "L" amarilla: barra vertical + barra horizontal, dentro del área segura
      const inSafe = x >= s0 && x < size - s0 && y >= s0 && y < size - s0;
      if (inSafe) {
        const x1 = cx - lw * 0.7, x2 = cx + lw * 0.7;
        const y1 = cy - size * 0.30, y2 = cy + size * 0.30;
        const hx1 = cx - size * 0.30, hx2 = cx + size * 0.30;
        const hy1 = cy + lw * 0.35 - lw, hy2 = cy + lw * 0.35 + lw;
        const enVertical = x >= x1 && x <= x2 && y >= y1 && y <= y2;
        const enHorizontal = x >= hx1 && x <= hx2 && y >= hy1 && y <= hy2;
        if (enVertical || enHorizontal) color = AMARILLO;
        // Punto blanco (la "i" del laboratorio)
        const dpx = Math.sqrt((x - (cx + size * 0.30)) ** 2 + (y - (cy - size * 0.30)) ** 2);
        if (dpx < lw * 0.45) color = BLANCO;
      }
      const i = (y * size + x) * 4;
      px[i] = color[0]; px[i + 1] = color[1]; px[i + 2] = color[2]; px[i + 3] = 255;
    }
  }
  // Filtro 0 (None) por fila
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const [s, m] of [[192, false], [512, false], [512, true]]) {
  const name = m ? "icon-maskable-512.png" : `icon-${s}.png`;
  writeFileSync(`public/icons/${name}`, png(s, m));
  console.log("✓", name, s + "px");
}

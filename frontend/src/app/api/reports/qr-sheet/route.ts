import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const r = await pool.query(
    `SELECT a.codigo_qr, a.nombre_activo, c.nombre_categoria, ar.nombre_area
     FROM activos a
     LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
     LEFT JOIN areas ar ON c.id_area = ar.id_area
     WHERE a.codigo_qr IS NOT NULL AND a.id_activo_padre IS NULL
     ORDER BY ar.nombre_area, c.nombre_categoria, a.nombre_activo`
  );

  const stickers = r.rows.map((a: any) => {
    const qr = a.codigo_qr;
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qr)}`;
    return `
    <div class="sticker">
      <div class="qr"><img src="${qrImg}" alt="QR" /></div>
      <div class="code">${qr}</div>
      <div class="name">${a.nombre_activo}</div>
      <div class="cat">UNIMAYOR · LAB Sistemas Embebidos y Mecanica-Electro </div>
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Stickers QR — Lab IUCMC</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10mm; background: #f2eeee; }
  h1 { font-size: 18px; color: #09488D; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; }
  .sticker {
    border: 1.5px dashed #bbb;
    border-radius: 8px;
    padding: 6px;
    text-align: center;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .qr img { width: 22mm; height: 22mm; }
  .code { font-family: 'Courier New', monospace; font-size: 7px; color: #333; word-break: break-all; margin-top: 3px; }
  .name { font-size: 10px; font-weight: 600; color: #09488D; margin-top: 3px; line-height: 1.2; }
  .cat { font-size: 8px; color: #888; margin-top: 1px; }
  @media print {
    body { padding: 0; }
    h1, .subtitle { display: none; }
    .grid { gap: 4mm; }
  }
</style>
</head>
<body>
  <h1>🔬 Stickers QR — Laboratorio IUCMC</h1>
  <p class="subtitle">Total: ${r.rows.length} activos · Imprimí y pegá cada sticker en su activo correspondiente · Dale Ctrl + P para imprimir</p>
  <div class="grid">${stickers}</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
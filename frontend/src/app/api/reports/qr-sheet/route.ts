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
      <div class="uni">Lab · Unimayor </div>
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Stickers QR — Lab IUCMC</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  /* @page con margen 0: elimina el pie de página del navegador al imprimir */
  @page { size: A4; margin: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
  .screen-header { padding: 8mm 10mm 2mm; }
  .screen-header h1 { font-size: 18px; color: #09488D; }
  .screen-header p { font-size: 12px; color: #666; margin-top: 4px; }

  /* 5 columnas x 6 filas = 24 stickers por página A4 */
  .grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 3mm;
    padding: 3mm;
  }
  .sticker {
    border: 1.2px dashed #999;
    border-radius: 5px;
    padding: 1.2mm;
    text-align: center;
    break-inside: avoid;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 44mm;
  }
  .qr img { width: 16mm; height: 16mm; }
  .code { font-family: 'Courier New', monospace; font-size: 5.5px; color: #333; word-break: break-all; margin-top: 1px; }
  .name { font-size: 8px; font-weight: 600; color: #3e8ce0; margin-top: 1px; line-height: 1.15; }
  .uni { font-size: 9px; font-weight: 400; color: #022e5d; margin-top: 1px; line-height: 1.15; } 
  @media print {
    body { background: #fff; }
    .screen-header { display: none; }
    .grid { padding: 5mm; }
  }
</style>
</head>
<body>
  <div class="screen-header">
    <h1>🔬 Stickers QR — Laboratorio IUCMC</h1>
    <p>Total: ${r.rows.length} activos · 24 stickers por página · Ctrl + P para imprimir (sin pie de página)</p>
  </div>
  <div class="grid">${stickers}</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

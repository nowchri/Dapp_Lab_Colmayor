import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// GET /api/reports/sticker/[id] — sticker individual imprimible de un activo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  const r = await pool.query(
    `SELECT a.codigo_qr, a.nombre_activo, c.nombre_categoria, ar.nombre_area
     FROM activos a
     LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
     LEFT JOIN areas ar ON c.id_area = ar.id_area
     WHERE a.id_activo = $1 AND a.codigo_qr IS NOT NULL`,
    [params.id]
  );

  if (r.rows.length === 0) {
    return new NextResponse("Activo no encontrado o sin QR", { status: 404 });
  }

  const a = r.rows[0];
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(a.codigo_qr)}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Sticker QR — ${a.nombre_activo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20mm; background: #f2eeee; }
  .sticker {
    border: 2px dashed #999;
    border-radius: 10px;
    padding: 8mm;
    text-align: center;
    max-width: 70mm;
    margin: 0 auto;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .qr img { width: 40mm; height: 40mm; background: #fff; border-radius: 6px; padding: 2mm; border: 1px solid #ddd; }
  .code { font-family: 'Courier New', monospace; font-size: 11px; color: #222; word-break: break-all; margin-top: 4px; }
  .name { font-size: 15px; font-weight: 700; color: #09488D; margin-top: 5px; line-height: 1.2; }
  .cat { font-size: 11px; color: #555; margin-top: 3px; }
  .lab { font-size: 10px; color: #888; margin-top: 6px; letter-spacing: 1px; }
  .hint { text-align: center; font-size: 12px; color: #888; margin-top: 8mm; }
  @media print {
    body { padding: 0; }
    .hint { display: none; }
    .sticker { border: 1.5px dashed #999; }
  }
</style>
</head>
<body>
  <div class="sticker">
    <div class="qr"><img src="${qrImg}" alt="QR" /></div>
    <div class="code">${a.codigo_qr}</div>
    <div class="name">${a.nombre_activo}</div>
    <div class="cat">${a.nombre_area || ""}${a.nombre_categoria ? " · " + a.nombre_categoria : ""}</div>
    <div class="lab">UNIMAYOR · LAB</div>
  </div>
  <p class="hint">Ctrl + P para imprimir / guardar como PDF</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
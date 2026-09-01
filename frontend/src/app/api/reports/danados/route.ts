import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await getSessionUser();
  if (!usuario || (usuario.rol !== "admin" && usuario.rol !== "monitor")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const pool = getPool();
  const r = await pool.query(
    `SELECT a.nombre_activo, a.tipo, c.nombre_categoria, a.observaciones_iniciales
     FROM activos a LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
     WHERE a.estado = 'dañado' AND a.id_activo_padre IS NULL ORDER BY a.nombre_activo`
  );

  const rows = r.rows.map((a: any) => `
    <tr>
      <td style="padding:10px;border:1px solid #ddd">${a.nombre_activo}</td>
      <td style="padding:10px;border:1px solid #ddd">${a.tipo}</td>
      <td style="padding:10px;border:1px solid #ddd">${a.nombre_categoria || '-'}</td>
      <td style="padding:10px;border:1px solid #ddd">${a.observaciones_iniciales || '-'}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Activos Dañados</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#1a1a2e}
h1{color:#09488D;font-size:22px}h2{color:#09488D;font-size:16px;margin-top:24px}
table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#09488D;color:white;padding:10px;text-align:left;font-size:13px}
.footer{margin-top:30px;font-size:11px;color:#888}@media print{body{margin:0;padding:10px}}</style></head><body>
<h1>🔴 Reporte de Activos Dañados</h1>
<h2>Laboratorio IUCMC — ${new Date().toLocaleDateString("es-CO")}</h2>
<p style="margin-top:8px;color:#555;font-size:14px">Este reporte lista los activos del laboratorio que se encuentran en estado <strong>dañado</strong> y requieren atención o reparación.</p>
<p style="margin-top:4px;color:#888;font-size:13px">Total: <strong>${r.rows.length}</strong> activos dañados</p>
<table><thead><tr><th>Nombre</th><th>Tipo</th><th>Categoría</th><th>Observaciones</th></tr></thead><tbody>${rows}</tbody></table>
<p class="footer">Generado por Lab IUCMC · IUCMC · Para descargar, haz Ctrl + P Para imprimir o guardar como PDF</p>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

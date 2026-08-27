import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const r = await pool.query(
    `SELECT pe.nombre_completo, pe.codigo_estudiantil, pe.correo_institucional, pe.telefono,
            p.fecha_limite, p.materia, p.profesor_encargado,
            (NOW() - (p.fecha_limite + INTERVAL '8 days')) as dias_vencido
     FROM prestamos p
     JOIN perfiles pe ON p.id_estudiante = pe.id_perfil
     WHERE p.estado_general = 'activo' AND p.fecha_limite + INTERVAL '8 days' < NOW()
     ORDER BY dias_vencido DESC`
  );

  const rows = r.rows.map((m: any) => `
    <tr>
      <td style="padding:10px;border:1px solid #ddd">${m.nombre_completo}</td>
      <td style="padding:10px;border:1px solid #ddd">${m.codigo_estudiantil || '-'}</td>
      <td style="padding:10px;border:1px solid #ddd">${m.correo_institucional}</td>
      <td style="padding:10px;border:1px solid #ddd">${m.telefono || '-'}</td>
      <td style="padding:10px;border:1px solid #ddd">${m.materia || '-'}</td>
      <td style="padding:10px;border:1px solid #ddd">${new Date(m.fecha_limite).toLocaleDateString("es-CO")}</td>
      <td style="padding:10px;border:1px solid #ddd;color:#ef4444;font-weight:bold">${Math.round(Number(m.dias_vencido))} días</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Estudiantes en Mora</title>
<style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:20px;color:#1a1a2e}
h1{color:#09488D;font-size:22px}h2{color:#09488D;font-size:16px;margin-top:24px}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th{background:#09488D;color:white;padding:10px;text-align:left}
.footer{margin-top:30px;font-size:11px;color:#888}@media print{body{margin:0;padding:10px}}</style></head><body>
<h1>🚨 Reporte de Estudiantes en Mora</h1>
<h2>Laboratorio IUCMC — ${new Date().toLocaleDateString("es-CO")}</h2>
<p style="margin-top:8px;color:#555;font-size:14px">Estudiantes con préstamos activos que superaron la fecha límite + 8 días de gracia.</p>
<p style="margin-top:4px;color:#888;font-size:13px">Total: <strong>${r.rows.length}</strong> estudiantes en mora</p>
<table><thead><tr><th>Nombre</th><th>Código</th><th>Correo</th><th>Teléfono</th><th>Materia</th><th>Fecha límite</th><th>Días vencido</th></tr></thead><tbody>${rows}</tbody></table>
<p class="footer">Generado por Lab IUCMC · IUCMC · Para descargar, haz Ctrl + P Para imprimir o guardar como PDF</p>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

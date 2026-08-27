import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const r = await pool.query(
    `SELECT a.nombre_activo, a.tipo, a.estado, c.nombre_categoria, ar.nombre_area, a.codigo_qr, a.observaciones_iniciales, a.stock_actual,
            (SELECT COUNT(*) FROM activos WHERE id_activo_padre = a.id_activo) as componentes
    FROM activos a LEFT JOIN categorias c ON a.id_categoria = c.id_categoria LEFT JOIN areas ar ON c.id_area = ar.id_area
    WHERE a.id_activo_padre IS NULL ORDER BY ar.nombre_area, a.tipo, a.nombre_activo`
  );
  const BOM = "\uFEFF";
  let csv = BOM + "Nombre,Tipo,Estado,Area,Categoria,QR,Observaciones,Componentes\n";
  for (const row of r.rows) {
    // Consumibles: la columna Componentes muestra el stock; kits: cantidad de componentes
    const comp = row.tipo === "consumible" ? (row.stock_actual ?? 0) : row.componentes;
    csv += `"${row.nombre_activo}","${row.tipo}","${row.estado}","${row.nombre_area || ''}","${row.nombre_categoria || ''}","${row.codigo_qr || ''}","${(row.observaciones_iniciales || '').replace(/"/g,'""')}","${comp}"\n`;
  }
  return new NextResponse(csv, { headers: {"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=inventario_lab_iu.csv"} });
}

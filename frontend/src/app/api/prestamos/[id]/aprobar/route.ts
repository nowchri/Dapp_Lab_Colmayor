import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cookies } from "next/headers";
import { sendConfirmacionPrestamo } from "@/lib/email";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ck = cookies();
  const rol = ck.get("userRol")?.value;
  const uid = ck.get("userId")?.value;
  if (rol !== "monitor" && rol !== "admin") {
    return NextResponse.json({ error: "Solo monitores pueden aprobar" }, { status: 403 });
  }

  const id_prestamo = params.id;
  const pool = getPool();

  // Get prestamo with student + monitor info
  const prestamo = await pool.query(
    `SELECT p.*, pe.nombre_completo as estudiante_nombre, pe.cedula as estudiante_cedula,
            pe.correo_institucional, pe.telefono, pe.programa_academico
     FROM prestamos p JOIN perfiles pe ON p.id_estudiante = pe.id_perfil
     WHERE p.id_prestamo = $1 AND p.estado_general = 'pendiente'`,
    [id_prestamo]
  );
  if (prestamo.rows.length === 0) {
    return NextResponse.json({ error: "Prestamo no encontrado o ya procesado" }, { status: 404 });
  }

  const p = prestamo.rows[0];

  // Get monitor name
  const monitor = await pool.query("SELECT nombre_completo FROM perfiles WHERE id_perfil = $1", [uid]);
  const monitorNombre = monitor.rows.length > 0 ? monitor.rows[0].nombre_completo : "Monitor";

  const hash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  await pool.query(
    "UPDATE prestamos SET id_monitor_validador = $1, blockchain_hash = $2, estado_general = 'activo' WHERE id_prestamo = $3",
    [uid, hash, id_prestamo]
  );

  // Update items
  const detalles = await pool.query(
    "SELECT dp.id_activo, a.nombre_activo, a.tipo, dp.cantidad_entregada FROM detalles_prestamo dp JOIN activos a ON dp.id_activo = a.id_activo WHERE dp.id_prestamo = $1 AND dp.esta_devuelto = false",
    [id_prestamo]
  );
  for (const d of detalles.rows) {
    await pool.query("UPDATE activos SET estado = 'prestado' WHERE id_activo = $1", [d.id_activo]);

    // Consumibles: reducir stock
    if (d.tipo === "consumible") {
      await pool.query("UPDATE activos SET stock_actual = GREATEST(stock_actual - $1, 0) WHERE id_activo = $2", [d.cantidad_entregada, d.id_activo]);
    }

    const parent = await pool.query(
      "SELECT id_activo_padre FROM activos WHERE id_activo = $1 AND id_activo_padre IS NOT NULL",
      [d.id_activo]
    );
    if (parent.rows.length > 0) {
      await pool.query("UPDATE activos SET estado = 'incompleto' WHERE id_activo = $1", [parent.rows[0].id_activo_padre]);
    }
  }

  // Send confirmation email (fire-and-forget)
  sendConfirmacionPrestamo({
    estudiante_nombre: p.estudiante_nombre,
    estudiante_cedula: p.estudiante_cedula,
    estudiante_correo: p.correo_institucional,
    estudiante_telefono: p.telefono,
    estudiante_programa: p.programa_academico,
    monitor_nombre: monitorNombre,
    materia: p.materia,
    profesor_encargado: p.profesor_encargado,
    curso_grupo: p.curso_grupo,
    fecha_inicio: p.fecha_inicio,
    fecha_limite: p.fecha_limite,
    blockchain_hash: hash,
    dias_mora: 0,
    items: detalles.rows.map((d: any) => ({
      activo_nombre: d.nombre_activo,
      cantidad: d.cantidad_entregada,
      activo_tipo: d.tipo,
    })),
  }).catch(err => console.error("[Email] Error enviando confirmación:", err));

  return NextResponse.json({ success: true, hash });
}
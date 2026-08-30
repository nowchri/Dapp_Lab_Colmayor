import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { sendConfirmacionPrestamo } from "@/lib/email";
import { computeLoanHash, computeAssetHash, computeStudentHash } from "@/lib/polygon";
import { registrarEnCadena } from "@/lib/cadena";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getSessionUser();
  const rol = usuario?.rol || "";
  const uid = usuario?.id_perfil || "";
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

  // Items de la bolsa
  const detalles = await pool.query(
    `SELECT dp.id_activo, a.nombre_activo, a.tipo, a.codigo_qr, dp.cantidad_entregada, ar.nombre_area
     FROM detalles_prestamo dp
     JOIN activos a ON dp.id_activo = a.id_activo
     LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
     LEFT JOIN areas ar ON c.id_area = ar.id_area
     WHERE dp.id_prestamo = $1 AND dp.esta_devuelto = false`,
    [id_prestamo]
  );
  if (detalles.rows.length === 0) {
    return NextResponse.json({ error: "La bolsa no tiene activos" }, { status: 400 });
  }

  // 1. Hashing (RF-10): nunca datos personales en cadena
  const loanHash = computeLoanHash(id_prestamo);
  const studentHash = computeStudentHash(p.id_estudiante);
  // 2. Registrar en la cadena local (registro_blockchain, encadenado por hash)
  const eslabones = detalles.rows.map((d: any) => ({
    assetHash: computeAssetHash(d.codigo_qr || d.id_activo),
    id_activo: d.id_activo,
    estado: "prestado",
    ubicacion: d.nombre_area || "",
  }));
  let txHashes: string[] = [];
  try {
    txHashes = await registrarEnCadena("loan", id_prestamo, loanHash, eslabones, studentHash, p.id_estudiante, uid || "");
  } catch (err: any) {
    console.error("[cadena] Error registrando préstamo:", err?.message || err);
    return NextResponse.json({ error: "No se pudo registrar la trazabilidad. Reintentá." }, { status: 502 });
  }
  const hash = txHashes.join(",");

  // 3. Actualizar BD (recién después de confirmar la tx)
  await pool.query(
    "UPDATE prestamos SET id_monitor_validador = $1, blockchain_hash = $2, estado_general = 'activo' WHERE id_prestamo = $3",
    [uid, hash, id_prestamo]
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

  // 4. Email de confirmación (fire-and-forget)
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
    blockchain_hash: txHashes[0] || hash,
    dias_mora: 0,
    items: detalles.rows.map((d: any) => ({
      activo_nombre: d.nombre_activo,
      cantidad: d.cantidad_entregada,
      activo_tipo: d.tipo,
    })),
  }).catch(err => console.error("[Email] Error enviando confirmación:", err));

  return NextResponse.json({ success: true, hash, tx_count: txHashes.length });
}

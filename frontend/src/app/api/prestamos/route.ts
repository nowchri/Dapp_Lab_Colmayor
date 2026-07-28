import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cookies } from "next/headers";

// GET — Listar prestamos (filtrado por rol)
export async function GET() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get("userId")?.value; // userId = id_perfil real, NOT session cookie
  const rol = cookieStore.get("userRol")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const pool = getPool();
    let result;

    if (rol === "estudiante") {
      const uid = cookieStore.get("userId")?.value;
      if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      result = await pool.query(
        `SELECT p.*, pe.nombre_completo as estudiante_nombre, pm.nombre_completo as monitor_nombre
         FROM prestamos p
         JOIN perfiles pe ON p.id_estudiante = pe.id_perfil
         LEFT JOIN perfiles pm ON p.id_monitor_validador = pm.id_perfil
         WHERE p.id_estudiante = $1
         ORDER BY p.fecha_inicio DESC`,
        [uid]
      );
    } else {
      result = await pool.query(
        `SELECT p.*, pe.nombre_completo as estudiante_nombre, pm.nombre_completo as monitor_nombre
         FROM prestamos p
         JOIN perfiles pe ON p.id_estudiante = pe.id_perfil
         LEFT JOIN perfiles pm ON p.id_monitor_validador = pm.id_perfil
         ORDER BY p.fecha_inicio DESC`
      );
    }

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("[prestamos/GET]", error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: crea un préstamo nuevo (bolsa/carrito)
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const sessionId = cookieStore.get("userId")?.value; // userId = id_perfil real, NOT session cookie

  if (!sessionId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { items, fecha_limite, materia, profesor_encargado, curso_grupo } = body;

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "La bolsa no puede estar vacia" }, { status: 400 });
  }

  if (!fecha_limite) {
    return NextResponse.json({ error: "Fecha limite obligatoria" }, { status: 400 });
  }

  // Validar que cada item tenga id_activo
  for (const item of items) {
    if (!item.id_activo) {
      return NextResponse.json({ error: "Cada item debe tener id_activo" }, { status: 400 });
    }
  }

  try {
    const pool = getPool();

    // Validacion JIT de bloqueo por mora (D1 + D8)
    // Si falla, continuamos sin bloquear
    try {
      const vencidos = await pool.query(
        `SELECT COUNT(*) as cnt FROM prestamos
         WHERE id_estudiante = $1
           AND fecha_limite + INTERVAL '8 days' < NOW()
           AND estado_general = 'activo'`,
        [sessionId]
      );
      const toggle = process.env.BLOQUEO_POR_MORA !== "false";
      const cnt = parseInt(vencidos.rows[0]?.cnt ?? "0", 10);
      if (toggle && cnt > 0) {
        return NextResponse.json({
          error: "Bloqueado: tienes material pendiente con mas de 8 dias de retraso"
        }, { status: 403 });
      }
    } catch (e) {
      console.warn("[prestamos] JIT mora check non-blocking error:", e);
    }

    // Insertar cabecera de prestamo
    const insertResult = await pool.query(
      `INSERT INTO prestamos (id_estudiante, fecha_limite, materia, profesor_encargado, curso_grupo, estado_general)
       VALUES ($1, $2, $3, $4, $5, 'pendiente')
       RETURNING id_prestamo`,
      [sessionId, fecha_limite, materia || null, profesor_encargado || null, curso_grupo || null]
    );

    const nuevaId = insertResult.rows[0]?.id_prestamo;

    if (!nuevaId) {
      throw new Error("INSERT no devolvio id_prestamo");
    }

    // Insertar cada detalle de la bolsa
    for (const item of items) {
      await pool.query(
        `INSERT INTO detalles_prestamo (id_prestamo, id_activo, cantidad_entregada, observacion_entrega)
         VALUES ($1, $2, $3, $4)`,
        [nuevaId, item.id_activo, item.cantidad_entregada || 1, item.observacion_entrega || null]
      );
    }

    return NextResponse.json({ id_prestamo: nuevaId }, { status: 201 });
  } catch (error: any) {
    console.error("[prestamos/POST]", error.message, error.stack);
    return NextResponse.json({
      error: error.message || "Error interno al crear prestamo"
    }, { status: 500 });
  }
}
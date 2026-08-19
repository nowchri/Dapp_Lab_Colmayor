import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const ck = cookies();
    const userId = ck.get("userId")?.value;
    const rol = ck.get("userRol")?.value;

    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const { items, dias_prestamo, nombre_docente, materia, profesor_encargado, curso_grupo } = body;

    if (!items || items.length === 0) return NextResponse.json({ error: "La bolsa está vacía" }, { status: 400 });

    const pool = getPool();
    let idEstudiante = userId;
    const isDocente = !!nombre_docente;

    if (isDocente) {
      if (rol !== "monitor" && rol !== "admin") {
        return NextResponse.json({ error: "Solo monitores pueden registrar préstamos a docentes" }, { status: 403 });
      }
      if (!nombre_docente.trim()) return NextResponse.json({ error: "Nombre del docente obligatorio" }, { status: 400 });
    } else {
      if (rol === "monitor" || rol === "admin") {
        return NextResponse.json({ error: "Monitores deben usar 'Préstamo a Docente'" }, { status: 400 });
      }
    }

    const fechaLimite = `NOW() + INTERVAL '${dias_prestamo || 8} days'`;

    const result = await pool.query(
      `INSERT INTO prestamos (id_estudiante, fecha_limite, materia, profesor_encargado, curso_grupo, estado_general, nombre_docente)
       VALUES ($1, ${fechaLimite}, $2, $3, $4, 'pendiente', $5) RETURNING id_prestamo`,
      [idEstudiante, materia || null, profesor_encargado || null, curso_grupo || null, nombre_docente || null]
    );

    const idPrestamo = result.rows[0].id_prestamo;

    for (const item of items) {
      await pool.query(
        "INSERT INTO detalles_prestamo (id_prestamo, id_activo, cantidad_entregada) VALUES ($1, $2, $3)",
        [idPrestamo, item.id_activo, item.cantidad || 1]
      );
    }

    return NextResponse.json({ id_prestamo: idPrestamo, ok: true }, { status: 201 });
  } catch (error: any) {
    console.error("[prestamos/POST]", error.message);
    return NextResponse.json({ error: "Error al crear préstamo" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const ck = cookies();
    const userId = ck.get("userId")?.value;
    const rol = ck.get("userRol")?.value;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const pool = getPool();

    // Auto-mark overdue loans as mora and send alerts (only once per new mora)
    const moraResult = await pool.query(
      `UPDATE prestamos SET estado_general = 'mora'
       WHERE estado_general = 'activo' AND fecha_limite + INTERVAL '8 days' < NOW()
       RETURNING id_prestamo, id_estudiante, fecha_limite, materia, profesor_encargado, curso_grupo`
    );

    if (moraResult.rows.length > 0) {
      const { sendAlertaMora } = await import("@/lib/email");
      for (const mp of moraResult.rows) {
        const student = await pool.query(
          "SELECT nombre_completo, cedula, correo_institucional, telefono, programa_academico FROM perfiles WHERE id_perfil = $1",
          [mp.id_estudiante]
        );
        if (student.rows.length === 0) continue;
        const s = student.rows[0];
        const items = await pool.query(
          `SELECT a.nombre_activo, dp.cantidad_entregada, a.tipo
           FROM detalles_prestamo dp JOIN activos a ON dp.id_activo = a.id_activo
           WHERE dp.id_prestamo = $1 AND dp.esta_devuelto = false`,
          [mp.id_prestamo]
        );
        const dias = Math.ceil((Date.now() - new Date(mp.fecha_limite).getTime()) / 86400000);
        sendAlertaMora({
          estudiante_nombre: s.nombre_completo,
          estudiante_cedula: s.cedula,
          estudiante_correo: s.correo_institucional,
          estudiante_telefono: s.telefono,
          estudiante_programa: s.programa_academico,
          monitor_nombre: "Sistema",
          materia: mp.materia,
          profesor_encargado: mp.profesor_encargado,
          curso_grupo: mp.curso_grupo,
          fecha_inicio: new Date().toISOString(),
          fecha_limite: mp.fecha_limite,
          dias_mora: Math.max(dias, 0),
          items: items.rows.map((i: any) => ({ activo_nombre: i.nombre_activo, cantidad: i.cantidad_entregada, activo_tipo: i.tipo })),
        }).catch(err => console.error("[Email] Error enviando mora:", err));
      }
    }

    let result;
    if (rol === "estudiante") {
      result = await pool.query(
        `SELECT p.*, pe.nombre_completo as estudiante_nombre
         FROM prestamos p JOIN perfiles pe ON p.id_estudiante = pe.id_perfil
         WHERE p.id_estudiante = $1 ORDER BY p.fecha_inicio DESC`,
        [userId]
      );
    } else {
      result = await pool.query(
        `SELECT p.*, pe.nombre_completo as estudiante_nombre
         FROM prestamos p JOIN perfiles pe ON p.id_estudiante = pe.id_perfil
         ORDER BY p.fecha_inicio DESC`
      );
    }

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("[prestamos/GET]", error.message);
    return NextResponse.json({ error: "Error al consultar" }, { status: 500 });
  }
}
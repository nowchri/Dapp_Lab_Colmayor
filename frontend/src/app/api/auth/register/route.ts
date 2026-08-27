import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const correo = (body.correo_institucional || body.correo || "").toString().toLowerCase().trim();
    const codigo = (body.codigo_estudiantil || "").toString().trim();
    const nombre = (body.nombre_completo || "").toString().trim();
    const cedula = (body.cedula || "").toString().trim();
    const telefono = (body.telefono || "").toString().trim();

    // Validaciones
    if (!correo || !correo.endsWith("@unimayor.edu.co")) {
      return NextResponse.json({ error: "Correo institucional invalido. Debe ser @unimayor.edu.co" }, { status: 400 });
    }
    if (!codigo) {
      return NextResponse.json({ error: "El codigo estudiantil es obligatorio" }, { status: 400 });
    }
    if (!nombre) {
      return NextResponse.json({ error: "El nombre completo es obligatorio" }, { status: 400 });
    }
    if (!cedula) {
      return NextResponse.json({ error: "La cedula es obligatoria" }, { status: 400 });
    }
    if (!telefono) {
      return NextResponse.json({ error: "El telefono es obligatorio" }, { status: 400 });
    }

    const pool = getPool();

    // Verificar duplicados
    const exists = await pool.query(
      "SELECT id_perfil FROM perfiles WHERE correo_institucional = $1 OR codigo_estudiantil = $2 OR cedula = $3",
      [correo, codigo, cedula]
    );
    if (exists.rows.length > 0) {
      return NextResponse.json({ error: "Ya existe un perfil con ese correo, codigo o cedula" }, { status: 400 });
    }

    const r = await pool.query(
      `INSERT INTO perfiles (codigo_estudiantil, cedula, nombre_completo, correo_institucional, telefono, rol)
       VALUES ($1, $2, $3, $4, $5, 'estudiante')
       RETURNING id_perfil`,
      [codigo, cedula, nombre, correo, telefono]
    );

    return NextResponse.json({ ok: true, id_perfil: r.rows[0].id_perfil }, { status: 201 });
  } catch (e: any) {
    console.error("[register]", e);
    return NextResponse.json({ error: "Error interno: " + e.message }, { status: 500 });
  }
}
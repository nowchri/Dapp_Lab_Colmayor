import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
export const dynamic = "force-dynamic";

// PUNTO DE CONEXION EXTERNA: PostgreSQL local
// GET — listar todos los monitores
export async function GET() {
  const usuario = await getSessionUser();
  if (!usuario || usuario.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const pool = getPool();
  const r = await pool.query(
    "SELECT id_perfil, codigo_estudiantil, nombre_completo, correo_institucional, telefono FROM perfiles WHERE rol = 'monitor' ORDER BY nombre_completo"
  );
  return NextResponse.json(r.rows);
}

// POST — crear nuevo monitor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo_estudiantil, cedula, nombre_completo, correo_institucional, telefono, password } = body;

    if (!nombre_completo || !correo_institucional || !codigo_estudiantil) {
      return NextResponse.json({ error: "Nombre, correo y codigo son obligatorios" }, { status: 400 });
    }

    const email = correo_institucional.toLowerCase().trim();
    if (!email.endsWith("@unimayor.edu.co")) {
      return NextResponse.json({ error: "Correo institucional invalido" }, { status: 400 });
    }

    const pool = getPool();
    const exists = await pool.query(
      "SELECT id_perfil FROM perfiles WHERE correo_institucional = $1 OR codigo_estudiantil = $2",
      [email, codigo_estudiantil.trim()]
    );
    if (exists.rows.length > 0) {
      return NextResponse.json({ error: "Ya existe un perfil con ese correo o codigo" }, { status: 400 });
    }

    // Contraseña opcional: si no se define, el monitor la crea en su primer ingreso
    let password_hash: string | null = null;
    if (password) {
      if (String(password).length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      }
      password_hash = await bcrypt.hash(String(password), 10);
    }

    const r = await pool.query(
      `INSERT INTO perfiles (codigo_estudiantil, cedula, nombre_completo, correo_institucional, telefono, rol, password_hash)
       VALUES ($1, $2, $3, $4, $5, 'monitor', $6)
       RETURNING id_perfil`,
      [codigo_estudiantil.trim(), cedula || null, nombre_completo.trim(), email, telefono || null, password_hash]
    );

    return NextResponse.json({ ok: true, id_perfil: r.rows[0].id_perfil }, { status: 201 });
  } catch (e: any) {
    console.error("[monitores/POST]", e);
    return NextResponse.json({ error: "Error interno: " + e.message }, { status: 500 });
  }
}
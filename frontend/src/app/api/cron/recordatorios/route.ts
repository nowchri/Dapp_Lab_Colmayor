import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import webpush from "web-push";

export const dynamic = "force-dynamic";

// POST /api/cron/recordatorios — enviado por GitHub Actions (diario)
// Header obligatorio: x-cron-secret = CRON_SECRET
//
// Política de notificaciones: UNA sola por préstamo, el día antes de vencer
// (o el mismo día si el cron del día anterior no corrió). Nada de spam diario.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID no configurado" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:labadministrador@gmail.com", publicKey, privateKey);

  const pool = getPool();

  try {
    // Préstamos activos SIN recordatorio enviado y que vencen HOY o MAÑANA
    const r = await pool.query(
      `SELECT p.id_prestamo, p.id_estudiante, p.fecha_limite, pe.nombre_completo,
              (p.fecha_limite::date = now()::date) AS vence_hoy
       FROM prestamos p
       JOIN perfiles pe ON pe.id_perfil = p.id_estudiante
       WHERE p.estado_general = 'activo'
         AND p.recordatorio_enviado IS NULL
         AND p.fecha_limite::date BETWEEN now()::date AND now()::date + 1`
    );

    if (r.rows.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0, mensaje: "Nadie vence hoy/mañana" });
    }

    const subs = await pool.query(
      "SELECT id_suscripcion, id_perfil, endpoint, p256dh, auth_key FROM push_suscripciones"
    );
    const porUsuario = new Map<string, any[]>();
    for (const s of subs.rows) {
      const arr = porUsuario.get(String(s.id_perfil)) || [];
      arr.push(s);
      porUsuario.set(String(s.id_perfil), arr);
    }

    // Agrupar por estudiante
    const porEstudiante = new Map<string, { loans: any[]; venceHoy: boolean }>();
    for (const row of r.rows) {
      const g = porEstudiante.get(String(row.id_estudiante)) || { loans: [], venceHoy: false };
      g.loans.push(row);
      if (row.vence_hoy) g.venceHoy = true;
      porEstudiante.set(String(row.id_estudiante), g);
    }

    let enviados = 0;
    let eliminadas = 0;

    for (const [idEstudiante, g] of porEstudiante) {
      const subsUser = porUsuario.get(idEstudiante) || [];
      if (subsUser.length === 0) continue; // sin suscripción → no molestar

      const n = g.loans.length;
      const fechaMax = new Date(Math.max(...g.loans.map((l) => new Date(l.fecha_limite).getTime())));
      const fechaTxt = fechaMax.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" });

      let titulo: string;
      let cuerpo: string;
      if (g.venceHoy) {
        titulo = "⏰ Vence HOY — Lab IUCMC";
        cuerpo = n > 1
          ? `${g.loans[0].nombre_completo}, tienes ${n} préstamos que vencen hoy. Devuélvelos antes del cierre del laboratorio.`
          : `${g.loans[0].nombre_completo}, tu préstamo vence hoy. Devuélvelo antes del cierre del laboratorio.`;
      } else {
        titulo = "⏰ Mañana vence tu préstamo — Lab IUCMC";
        cuerpo = n > 1
          ? `${g.loans[0].nombre_completo}, tienes ${n} préstamos que vencen mañana (${fechaTxt}).`
          : `${g.loans[0].nombre_completo}, tu préstamo vence mañana (${fechaTxt}).`;
      }

      for (const s of subsUser) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
            JSON.stringify({ title: titulo, body: cuerpo, url: "/prestamos", tag: "lab-iu-recordatorio" })
          );
          enviados++;
        } catch (err: any) {
          // Suscripción muerta (410 Gone / 404) → limpiar
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await pool.query("DELETE FROM push_suscripciones WHERE id_suscripcion = $1", [s.id_suscripcion]);
            eliminadas++;
          } else {
            console.error("[cron/recordatorios] push error", err?.statusCode, s.endpoint.slice(0, 40));
          }
        }
      }

      // Marcar los préstamos como notificados (única vez)
      await pool.query(
        `UPDATE prestamos SET recordatorio_enviado = NOW()
         WHERE id_prestamo = ANY($1::uuid[])`,
        [g.loans.map((l) => l.id_prestamo)]
      );
    }

    return NextResponse.json({ ok: true, enviados, eliminadas });
  } catch (e: any) {
    console.error("[cron/recordatorios]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

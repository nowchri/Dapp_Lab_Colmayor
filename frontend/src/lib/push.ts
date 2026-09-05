/**
 * push.ts — Envío de notificaciones Web Push a usuarios por rol.
 * Usado por eventos de la app (nueva solicitud de préstamo → monitores).
 */
import webpush from "web-push";
import { getPool } from "@/lib/db";

export interface PayloadPush {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Envía un push a todos los usuarios suscritos que tengan alguno de los roles dados. */
export async function enviarPushPorRoles(roles: string[], payload: PayloadPush): Promise<number> {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) return 0; // no configurado → silencioso

  webpush.setVapidDetails("mailto:labadministrador@gmail.com", publicKey, privateKey);

  try {
    const pool = getPool();
    const subs = await pool.query(
      `SELECT s.id_suscripcion, s.endpoint, s.p256dh, s.auth_key
       FROM push_suscripciones s
       JOIN perfiles p ON p.id_perfil = s.id_perfil
       WHERE p.rol::text = ANY($1::text[])`,
      [roles]
    );

    let enviados = 0;
    for (const s of subs.rows) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
          JSON.stringify(payload)
        );
        enviados++;
      } catch (err: any) {
        // Suscripción muerta (410 Gone / 404) → limpiar
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await pool.query("DELETE FROM push_suscripciones WHERE id_suscripcion = $1", [s.id_suscripcion]);
        } else {
          console.error("[push]", err?.statusCode, s.endpoint.slice(0, 40));
        }
      }
    }
    return enviados;
  } catch (e) {
    console.error("[push/enviarPushPorRoles]", e);
    return 0;
  }
}

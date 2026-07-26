/**
 * email.ts — Servicio de correos (SendGrid)
 *
 * PUNTO DE CONEXION: SendGrid (E5 RESUELTO)
 *   API Key: https://app.sendgrid.com/settings/api_keys
 *   Free tier: 100 emails/día
 *
 * Plantillas:
 *   - sendConfirmacionPrestamo (RF-19)
 *   - sendAlertaMora (RF-14, D8: solo envía correos, no bloquea)s
 */

import { SENDGRID_API_KEY, EMAIL_FROM, ADMIN_EMAIL, DECANATURA_EMAIL } from "@shared/constants";

async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  cc?: string[]
): Promise<boolean> {
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY.includes("your-sendgrid")) {
    console.warn("[Email] API key no configurada. Email NO enviado:");
    console.warn(`  To: ${to}, Subject: ${subject}`);
    return false;
  }

  try {
    const payload = {
      personalizations: [
        {
          to: [{ email: to }],
          cc: cc?.map((email) => ({ email })) || undefined,
        },
      ],
      from: { email: EMAIL_FROM, name: "Lab Fisica IUCMC" },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    };

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`[Email] Enviado a ${to}: ${subject}`);
      return true;
    } else {
      console.error(`[Email] Error ${response.status}: ${await response.text()}`);
      return false;
    }
  } catch (error) {
    console.error("[Email] Error:", error);
    return false;
  }
}

interface PrestamoEmailData {
  estudiante_nombre: string;
  estudiante_cedula: string;
  estudiante_correo: string;
  estudiante_telefono?: string | null;
  estudiante_programa?: string | null;
  monitor_nombre: string;
  materia?: string | null;
  profesor_encargado?: string | null;
  curso_grupo?: string | null;
  fecha_inicio: string;
  fecha_limite: string;
  blockchain_hash?: string | null;
  dias_mora: number;
  items: { activo_nombre: string; cantidad: number; activo_tipo: string }[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function buildAssetList(items: PrestamoEmailData["items"]): string {
  return items.map(i =>
    `<li><strong>${i.activo_nombre}</strong> — ${i.cantidad} ud. [${i.activo_tipo}]</li>`
  ).join("");
}

/** RF-19: Confirmación de préstamo al estudiante */
export async function sendConfirmacionPrestamo(data: PrestamoEmailData): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#09488D;">
  <div style="background:#09488D;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:#FFFFFF;margin:0;">Lab Física y Sistemas Embebidos — IUCMC</h1>
  </div>
  <div style="background:#F0F4FA;padding:20px;border-radius:0 0 8px 8px;">
    <h2 style="color:#09488D;">✅ Confirmación de Préstamo</h2>
    <p>Hola <strong>${data.estudiante_nombre}</strong>,</p>
    <p>Tu préstamo ha sido aprobado por <strong>${data.monitor_nombre}</strong>.</p>
    <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;">
      <h3 style="color:#09488D;">📦 Material Prestado</h3>
      <ul>${buildAssetList(data.items)}</ul>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#6B7280;">Materia:</td><td>${data.materia || "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#6B7280;">Profesor:</td><td>${data.profesor_encargado || "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#6B7280;">Fecha inicio:</td><td>${formatDate(data.fecha_inicio)}</td></tr>
        <tr><td style="padding:4px 0;color:#6B7280;">Fecha límite:</td><td><strong style="color:#F7C800;">${formatDate(data.fecha_limite)}</strong></td></tr>
      </table>
    </div>
    <div style="background:#FFF8E1;padding:12px;border-radius:6px;border-left:4px solid #F7C800;">
      <p style="margin:0;font-size:14px;">⚠️ Devuelve el material en las mismas condiciones. Si lo dañas, debes reponerlo.</p>
    </div>
  </div>
</body>
</html>`.trim();

  return sendEmail(data.estudiante_correo, `[Lab IUCMC] Préstamo confirmado — ${data.estudiante_nombre}`, html);
}

/** RF-14: Alerta de mora a decanatura con CC al admin (D8: solo notifica, no bloquea) */
export async function sendAlertaMora(data: PrestamoEmailData): Promise<boolean> {
  const materiales = data.items.filter(i => i.activo_tipo === 'trazable')
    .map(i => `- ${i.activo_nombre}`).join("<br>");

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#09488D;">
  <div style="background:#C73E1D;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:#FFFFFF;margin:0;">⚠️ Alerta de Mora — Lab IUCMC</h1>
  </div>
  <div style="background:#F0F4FA;padding:20px;border-radius:0 0 8px 8px;">
    <p>Estimado/a Decano/a,</p>
    <p>El estudiante ha excedido el plazo + 8 días de gracia:</p>
    <div style="background:white;padding:15px;border-radius:6px;">
      <table style="width:100%;">
        <tr><td style="color:#6B7280;">Estudiante:</td><td><strong>${data.estudiante_nombre}</strong></td></tr>
        <tr><td style="color:#6B7280;">Cédula:</td><td>${data.estudiante_cedula}</td></tr>
        <tr><td style="color:#6B7280;">Programa:</td><td>${data.estudiante_programa || "—"}</td></tr>
        <tr><td style="color:#6B7280;">Contacto:</td><td>${data.estudiante_telefono || data.estudiante_correo}</td></tr>
        <tr><td style="color:#6B7280;">Materia:</td><td>${data.materia || "—"}</td></tr>
        <tr><td style="color:#6B7280;">Profesor:</td><td>${data.profesor_encargado || "—"}</td></tr>
        <tr><td style="color:#6B7280;">Fecha límite:</td><td>${formatDate(data.fecha_limite)}</td></tr>
        <tr><td style="color:#6B7280;">Días en mora:</td><td><strong style="color:#C73E1D;">${data.dias_mora}</strong></td></tr>
      </table>
    </div>
    <div style="background:white;padding:15px;border-radius:6px;margin-top:10px;">
      <h3 style="color:#09488D;">📦 Material Pendiente</h3>
      ${materiales}
    </div>
    <p style="font-size:12px;color:#6B7280;">Generado automáticamente — Sistema Gestión de Préstamos IUCMC.</p>
  </div>
</body>
</html>`.trim();

  return sendEmail(DECANATURA_EMAIL, `[Lab IUCMC] Alerta de mora — ${data.estudiante_nombre}`, html, [ADMIN_EMAIL]);
}

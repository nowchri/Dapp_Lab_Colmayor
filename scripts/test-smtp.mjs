// Envía correo de prueba por Gmail SMTP (usa .env)
import { readFileSync } from "fs";
import nodemailer from "nodemailer";

const env = readFileSync(new URL("../frontend/.env", import.meta.url), "utf8");
function get(k) {
  const l = env.split("\n").find(l => l.startsWith(k + "="));
  return l ? l.slice(k.length + 1).replace(/\r$/, "") : "";
}

const transporter = nodemailer.createTransport({
  host: get("SMTP_HOST") || "smtp.gmail.com",
  port: parseInt(get("SMTP_PORT") || "465", 10),
  secure: true,
  auth: { user: get("SMTP_USER"), pass: get("SMTP_PASS") },
});

const info = await transporter.sendMail({
  from: `"Lab Fisica IUCMC" <${get("EMAIL_FROM")}>`,
  to: "labadministrador@gmail.com",
  subject: "✅ SMTP configurado — prueba del Laboratorio IUCMC",
  html: "<p>Este correo confirma que el envío por Gmail SMTP quedó funcionando.</p><p>De ahora en adelante, cualquier duda o mensaje del sistema llegará a esta bandeja.</p>",
});

console.log("ENVIADO ✓ messageId:", info.messageId);

// Crea préstamo ACTIVO de prueba con items (para probar botones de recordatorio)
import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(new URL("../frontend/.env", import.meta.url), "utf8");
const lineas = env.split("\n").filter(l => l.startsWith("DATABASE_URL="));
const url = lineas[lineas.length - 1].match(/DATABASE_URL=(.+)/)[1].trim();
const client = new pg.Client({ connectionString: url, ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined });
await client.connect();

await client.query("DELETE FROM detalles_prestamo WHERE id_prestamo IN (SELECT id_prestamo FROM prestamos WHERE materia='TEST-RECORDATORIO')");
await client.query("DELETE FROM prestamos WHERE materia='TEST-RECORDATORIO'");

const t = await client.query("SELECT id_activo FROM activos WHERE codigo_qr IS NOT NULL ORDER BY nombre_activo LIMIT 2");
const prest = await client.query(
  "INSERT INTO prestamos (id_estudiante, fecha_inicio, fecha_limite, materia, estado_general, id_monitor_validador) VALUES ('fd10ffde-dc97-450e-8409-f5ec3af952ad', NOW(), NOW() + INTERVAL '8 days', 'TEST-RECORDATORIO', 'activo', '7e5e4818-07ba-40bc-85e1-819216939d4a') RETURNING id_prestamo"
);
const idP = prest.rows[0].id_prestamo;
const items = t.rows.map(r => "('" + idP + "', '" + r.id_activo + "', 1)").join(",");
await client.query("INSERT INTO detalles_prestamo (id_prestamo, id_activo, cantidad_entregada) VALUES " + items);
console.log("ID:" + idP);
await client.end();

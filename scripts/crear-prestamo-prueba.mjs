// Crea préstamo de prueba en la BD ACTIVA (supabase)
import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync(new URL("../frontend/.env", import.meta.url), "utf8");
const lineas = env.split("\n").filter(l => l.startsWith("DATABASE_URL="));
const url = lineas[lineas.length - 1].match(/DATABASE_URL=(.+)/)[1].trim();
const client = new pg.Client({ connectionString: url, ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined });
await client.connect();

await client.query("DELETE FROM detalles_prestamo WHERE id_prestamo IN (SELECT id_prestamo FROM prestamos WHERE materia='TEST-LIBRO')");
await client.query("DELETE FROM prestamos WHERE materia='TEST-LIBRO'");
const t = await client.query("SELECT id_activo FROM activos WHERE codigo_qr IS NOT NULL ORDER BY nombre_activo LIMIT 2");
const prest = await client.query("INSERT INTO prestamos (id_estudiante, fecha_limite, materia, estado_general) VALUES ('fd10ffde-dc97-450e-8409-f5ec3af952ad', NOW() + INTERVAL '8 days', 'TEST-LIBRO', 'pendiente') RETURNING id_prestamo");
const idP = prest.rows[0].id_prestamo;
const items = t.rows.map(r => "('" + idP + "', '" + r.id_activo + "', 1)").join(",");
await client.query("INSERT INTO detalles_prestamo (id_prestamo, id_activo, cantidad_entregada) VALUES " + items);
console.log("ID:" + idP + " (BD:" + url.split("@")[1].split("/")[0] + ")");
await client.end();

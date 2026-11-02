// 04-smoke-sql.mjs — Ejecuta contra el destino TODAS las consultas reales de la app.
// Objetivo: detectar incompatibilidades de dialecto antes de tocar Vercel.
// Uso: node scripts/migracion/04-smoke-sql.mjs

import { leerUrl, conectar } from "./01-extract.mjs";

const db = conectar(leerUrl("DATABASE_URL"));
await db.connect();

let ok = 0, fail = 0;

async function probar(nombre, sql, params = []) {
  try {
    const t0 = Date.now();
    const r = await db.query(sql, params);
    const ms = Date.now() - t0;
    console.log(`  ✓ ${nombre.padEnd(46)} ${String(r.rowCount).padStart(4)} filas · ${ms} ms`);
    ok++;
    return r;
  } catch (e) {
    console.log(`  ✗ ${nombre.padEnd(46)} ${e.message}`);
    fail++;
    return null;
  }
}

// ── ids reales para las pruebas con parámetros ──
const unPrestamo = (await db.query("SELECT id_prestamo FROM prestamos LIMIT 1")).rows[0]?.id_prestamo;
const unActivo   = (await db.query("SELECT id_activo FROM activos WHERE id_activo_padre IS NULL LIMIT 1")).rows[0]?.id_activo;
const unPerfil   = (await db.query("SELECT id_perfil FROM perfiles LIMIT 1")).rows[0]?.id_perfil;
const unDetalle  = (await db.query("SELECT id_detalle FROM detalles_prestamo LIMIT 1")).rows[0]?.id_detalle;
const unQR       = (await db.query("SELECT codigo_qr FROM activos WHERE codigo_qr IS NOT NULL LIMIT 1")).rows[0]?.codigo_qr;

console.log("\nCONSULTAS DE LA APP");

await probar("inventario (join triple + subconsulta hijos)",
  `SELECT a.*, c.nombre_categoria, c.descripcion_categoria, ar.nombre_area,
          (SELECT COUNT(*) FROM activos WHERE id_activo_padre = a.id_activo) as componentes
   FROM activos a
   LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
   LEFT JOIN areas ar ON c.id_area = ar.id_area
   WHERE a.id_activo_padre IS NULL
   ORDER BY a.tipo, a.nombre_activo`);

await probar("inventario / children",
  `SELECT a.*, c.nombre_categoria FROM activos a
   LEFT JOIN categorias c ON c.id_categoria = a.id_categoria
   WHERE a.id_activo_padre = $1 ORDER BY a.nombre_activo`, [unActivo]);

await probar("dashboard stats (12 COUNT en una query)",
  `SELECT
     (SELECT COUNT(*) FROM activos WHERE id_activo_padre IS NULL) as total_activos,
     (SELECT COUNT(*) FROM activos WHERE estado = 'disponible' AND id_activo_padre IS NULL) as disponibles,
     (SELECT COUNT(*) FROM activos WHERE estado = 'prestado' AND id_activo_padre IS NULL) as prestados,
     (SELECT COUNT(*) FROM activos WHERE estado = 'dañado' AND id_activo_padre IS NULL) as danados,
     (SELECT COUNT(*) FROM activos WHERE estado = 'mantenimiento' AND id_activo_padre IS NULL) as mantenimiento,
     (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'activo') as prestamos_activos,
     (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'devuelto') as devueltos,
     (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'mora') as en_mora,
     (SELECT COUNT(*) FROM activos WHERE tipo = 'trazable') as total_trazables,
     (SELECT COUNT(*) FROM activos WHERE tipo = 'consumible') as total_consumibles,
     (SELECT COUNT(*) FROM activos WHERE tipo = 'trazable' AND estado = 'prestado') as trazables_prestados,
     (SELECT COUNT(*) FROM activos WHERE tipo = 'consumible' AND estado = 'prestado') as consumibles_prestados`);

await probar("top activos (GROUP BY + FILTER + HAVING)",
  `SELECT a.nombre_activo, a.tipo, c.nombre_categoria,
          COUNT(DISTINCT p.id_prestamo) AS total_prestamos,
          COUNT(DISTINCT p.id_prestamo) FILTER (WHERE p.estado_general = 'devuelto') AS devueltos,
          COUNT(DISTINCT p.id_prestamo) FILTER (WHERE p.estado_general = 'activo')  AS en_curso,
          COUNT(DISTINCT p.id_prestamo) FILTER (WHERE p.estado_general = 'mora')    AS en_mora
   FROM detalles_prestamo d
   JOIN activos a ON a.id_activo = d.id_activo
   LEFT JOIN prestamos p ON p.id_prestamo = d.id_prestamo
   LEFT JOIN categorias c ON c.id_categoria = a.id_categoria
   GROUP BY a.id_activo, a.nombre_activo, a.tipo, c.nombre_categoria
   HAVING COUNT(DISTINCT p.id_prestamo) > 0
   ORDER BY total_prestamos DESC LIMIT 20`);

await probar("morosos (aritmética INTERVAL)",
  `SELECT pe.nombre_completo, p.fecha_limite,
          (NOW() - (p.fecha_limite + INTERVAL '8 days')) as dias_vencido
   FROM prestamos p JOIN perfiles pe ON p.id_estudiante = pe.id_perfil
   WHERE p.estado_general = 'activo' AND p.fecha_limite + INTERVAL '8 days' < NOW()
   ORDER BY dias_vencido DESC`);

await probar("recordatorios (::date BETWEEN now)",
  `SELECT p.id_prestamo, p.id_estudiante, p.fecha_limite, pe.nombre_completo,
          (p.fecha_limite::date = now()::date) AS vence_hoy
   FROM prestamos p JOIN perfiles pe ON pe.id_perfil = p.id_estudiante
   WHERE p.estado_general = 'activo' AND p.recordatorio_enviado IS NULL
     AND p.fecha_limite::date BETWEEN now()::date AND now()::date + 1`);

await probar("trazabilidad (ILIKE + 3 LEFT JOIN + paginación)",
  `SELECT r.id_registro, r.tipo, a.nombre_activo, pe.nombre_completo
   FROM registro_blockchain r
   LEFT JOIN activos a ON a.id_activo = r.id_activo
   LEFT JOIN perfiles pe ON pe.id_perfil = r.id_estudiante
   LEFT JOIN perfiles pm ON pm.id_perfil = r.id_monitor
   WHERE a.nombre_activo ILIKE '%' || $3 || '%' OR pe.nombre_completo ILIKE '%' || $3 || '%'
   ORDER BY r.id_registro DESC LIMIT $1::int OFFSET $2::int`, [30, 0, "kit"]);

await probar("push por rol (ANY text[])",
  `SELECT s.id_suscripcion, s.endpoint, s.p256dh, s.auth_key
   FROM push_suscripciones s JOIN perfiles p ON p.id_perfil = s.id_perfil
   WHERE p.rol::text = ANY($1::text[])`, [["monitor", "admin"]]);

await probar("login (lookup por correo)",
  `SELECT id_perfil, nombre_completo, rol, password_hash
   FROM perfiles WHERE correo_institucional = $1`, ["monitor@unimayor.edu.co"]);

await probar("sesión (cookie httpOnly válida)",
  `SELECT id_perfil, rol, nombre_completo, expires FROM sesiones
   WHERE sid = $1 AND expires > NOW()`, ["no-existe"]);

await probar("aprobar (detalles + áreas)",
  `SELECT dp.id_activo, a.nombre_activo, a.tipo, a.codigo_qr, dp.cantidad_entregada, ar.nombre_area
   FROM detalles_prestamo dp
   JOIN activos a ON dp.id_activo = a.id_activo
   LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
   LEFT JOIN areas ar ON c.id_area = ar.id_area
   WHERE dp.id_prestamo = $1 AND dp.esta_devuelto = false`, [unPrestamo]);

await probar("devolver (info de eslabón)",
  `SELECT a.codigo_qr, a.id_activo, ar.nombre_area
   FROM activos a
   JOIN detalles_prestamo dp ON dp.id_activo = a.id_activo
   LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
   LEFT JOIN areas ar ON c.id_area = ar.id_area
   WHERE dp.id_detalle = $1`, [unDetalle]);

await probar("devolver (hermanos prestados del kit)",
  `SELECT COUNT(*) as cnt FROM activos WHERE id_activo_padre = $1
   AND estado IN ('prestado','incompleto')`, [unActivo]);

await probar("excel-prestamos (6 joins)",
  `SELECT p.id_prestamo, p.estado_general, p.fecha_inicio, p.fecha_limite,
          a.nombre_activo, a.tipo AS tipo_activo, c.nombre_categoria,
          d.cantidad_entregada, d.esta_devuelto,
          e.nombre_completo AS estudiante_nombre, m.nombre_completo AS monitor_nombre,
          p.blockchain_hash
   FROM detalles_prestamo d
   JOIN prestamos p ON p.id_prestamo = d.id_prestamo
   JOIN activos a ON a.id_activo = d.id_activo
   LEFT JOIN categorias c ON c.id_categoria = a.id_categoria
   LEFT JOIN perfiles e ON e.id_perfil = p.id_estudiante
   LEFT JOIN perfiles m ON m.id_perfil = p.id_monitor_validador
   ORDER BY p.fecha_inicio DESC, a.nombre_activo`);

await probar("QR por código (escáner, matcheo exacto)",
  `SELECT id_activo, nombre_activo, estado FROM activos
   WHERE codigo_qr = $1 OR id_activo::text = $1`, [unQR]);

await probar("búsqueda de perfil por cédula/código",
  `SELECT id_perfil, nombre_completo FROM perfiles
   WHERE cedula = $1 OR codigo_estudiantil = $1`, ["1061768907"]);

console.log("\nESCRITURA (en transacción, con ROLLBACK — no deja rastro)");
try {
  await db.query("BEGIN");

  await db.query(
    `INSERT INTO areas (nombre_area, descripcion) VALUES ('__smoke__','prueba') RETURNING id_area`
  );
  console.log("  ✓ INSERT área (uuid por defecto gen_random_uuid)");

  await db.query(
    `INSERT INTO activos (codigo_qr, nombre_activo, tipo, estado, stock_actual)
     VALUES ('__QR_SMOKE__','Activo de prueba','consumible','disponible',10)`
  );
  console.log("  ✓ INSERT activo (enums tipo/estado)");

  const upd = await db.query(
    `UPDATE activos SET stock_actual = GREATEST(stock_actual - $1, 0)
     WHERE codigo_qr = '__QR_SMOKE__' RETURNING stock_actual`, [3]
  );
  console.log(`  ✓ UPDATE stock con GREATEST → ${upd.rows[0].stock_actual}`);

  const mora = await db.query(
    `UPDATE prestamos SET estado_general = 'mora'
     WHERE estado_general = 'activo' AND fecha_limite + INTERVAL '8 days' < NOW()
     RETURNING id_prestamo`
  );
  console.log(`  ✓ UPDATE ... RETURNING (marcado de mora) → ${mora.rowCount} filas`);

  await db.query("ROLLBACK");
  console.log("  ✓ ROLLBACK aplicado (sin cambios persistentes)");
} catch (e) {
  await db.query("ROLLBACK").catch(() => {});
  console.log(`  ✗ escritura: ${e.message}`);
  fail++;
}

await db.end();
console.log(`\n${ok} pruebas OK · ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);

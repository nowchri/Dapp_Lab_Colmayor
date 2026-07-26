/**
 * db.ts — Cliente PostgreSQL local (reemplaza Firebase)
 *
 * PUNTO DE CONEXION: PostgreSQL local
 *   Requiere: DATABASE_URL=postgresql://postgres:1234@localhost:5432/Bd_laboratorio
 *   Configurar en: frontend/.env
 *   Accion: Ya configurado — BD corriendo en PgAdmin local.
 *
 * Este modulo usa el paquete 'pg' (node-postgres) para conexión directa.
 * En entorno local, la BD ya está creada con el schema definido.
 * Para producción futura, migrar a un pool de conexiones serverless.
 */

import { Pool, QueryResult, QueryResultRow } from "pg";
import { DATABASE_URL } from "@shared/constants";

// Singleton pool (reutiliza conexiones)
let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,                          // Conexiones máximas (local, generoso)
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err);
    });
  }
  return pool;
}

// --- Helpers genéricos ---

/** Ejecuta una query y retorna las filas tipadas */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const client = getPool();
  const start = Date.now();
  const result = await client.query<T>(text, params);
  const duration = Date.now() - start;

  if (duration > 500) {
    console.warn(`[DB] Slow query (${duration}ms): ${text.substring(0, 100)}`);
  }

  return result;
}

/** Ejecuta un INSERT/UPDATE/DELETE y retorna el rowCount */
export async function execute(
  text: string,
  params?: any[]
): Promise<number> {
  const result = await query(text, params);
  return result.rowCount || 0;
}

/** Obtiene una sola fila o null */
export async function getOne<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

/** Obtiene todas las filas */
export async function getAll<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

/** Transacción: ejecuta un callback dentro de BEGIN/COMMIT/ROLLBACK */
export async function transaction<T>(
  fn: (client: any) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// --- Queries predefinidas para las tablas del schema ---

// ============ PERFILES ============

/** Buscar perfil por correo institucional */
export async function getPerfilByEmail(correo: string) {
  return getOne(
    "SELECT * FROM perfiles WHERE correo_institucional = $1",
    [correo]
  );
}

/** Buscar perfil por código estudiantil */
export async function getPerfilByCodigo(codigo: string) {
  return getOne(
    "SELECT * FROM perfiles WHERE codigo_estudiantil = $1",
    [codigo]
  );
}

/** Registrar nuevo perfil (RF-01) */
export async function createPerfil(data: {
  codigo_estudiantil: string;
  cedula: string;
  nombre_completo: string;
  correo_institucional: string;
  programa_academico?: string;
  telefono?: string;
  rol?: string;
}) {
  return getOne(
    `INSERT INTO perfiles (codigo_estudiantil, cedula, nombre_completo, correo_institucional, programa_academico, telefono, rol)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.codigo_estudiantil,
      data.cedula,
      data.nombre_completo,
      data.correo_institucional,
      data.programa_academico || null,
      data.telefono || null,
      data.rol || "estudiante",
    ]
  );
}

/** Validación Just-in-Time (D1 + D8):
 *  SELECT COUNT(*) FROM prestamos WHERE id_estudiante = $1
 *  AND fecha_limite < NOW() AND estado_general = 'activo'
 */
export async function countPrestamosVencidos(id_estudiante: string): Promise<number> {
  const result = await getOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM prestamos
     WHERE id_estudiante = $1
       AND fecha_limite < NOW()
       AND estado_general = 'activo'`,
    [id_estudiante]
  );
  return result ? parseInt(result.count, 10) : 0;
}

// ============ ACTIVOS ============

/** Crear nuevo activo (RF-16) */
export async function createActivo(data: {
  codigo_qr?: string | null;
  nombre_activo: string;
  id_categoria?: string | null;
  id_activo_padre?: string | null;
  tipo?: string;
  observaciones_iniciales?: string | null;
}) {
  return getOne(
    `INSERT INTO activos (codigo_qr, nombre_activo, id_categoria, id_activo_padre, tipo, observaciones_iniciales)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.codigo_qr || null,
      data.nombre_activo,
      data.id_categoria || null,
      data.id_activo_padre || null,
      data.tipo || "trazable",
      data.observaciones_iniciales || null,
    ]
  );
}

/** Buscar activo por código QR */
export async function getActivoByQR(codigo_qr: string) {
  return getOne(
    "SELECT * FROM activos WHERE codigo_qr = $1",
    [codigo_qr]
  );
}

/** Listar todos los activos con categoría */
export async function getAllActivos() {
  return getAll(
    `SELECT a.*, c.nombre_categoria
     FROM activos a
     LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
     ORDER BY a.nombre_activo`
  );
}

// ============ PRÉSTAMOS ============

/** Crear cabecera de préstamo (RF-08) */
export async function createPrestamo(data: {
  id_estudiante: string;
  id_monitor_validador?: string;
  fecha_limite: string;
  materia?: string;
  profesor_encargado?: string;
  curso_grupo?: string;
}) {
  return getOne(
    `INSERT INTO prestamos (id_estudiante, id_monitor_validador, fecha_limite, materia, profesor_encargado, curso_grupo, estado_general)
     VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
     RETURNING *`,
    [
      data.id_estudiante,
      data.id_monitor_validador || null,
      data.fecha_limite,
      data.materia || null,
      data.profesor_encargado || null,
      data.curso_grupo || null,
    ]
  );
}

/** Agregar detalle a préstamo */
export async function addDetallePrestamo(data: {
  id_prestamo: string;
  id_activo: string;
  cantidad_entregada?: number;
  observacion_entrega?: string;
}) {
  return getOne(
    `INSERT INTO detalles_prestamo (id_prestamo, id_activo, cantidad_entregada, observacion_entrega)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.id_prestamo,
      data.id_activo,
      data.cantidad_entregada || 1,
      data.observacion_entrega || null,
    ]
  );
}

/** Aprobar préstamo + registrar hash blockchain (RF-09, RF-10) */
export async function approvePrestamo(
  id_prestamo: string,
  id_monitor_validador: string,
  blockchain_hash: string
) {
  return getOne(
    `UPDATE prestamos
     SET id_monitor_validador = $2,
         blockchain_hash = $3,
         estado_general = 'activo'
     WHERE id_prestamo = $1
     RETURNING *`,
    [id_prestamo, id_monitor_validador, blockchain_hash]
  );
}

/** Cerrar préstamo (devolución completa — RF-11) */
export async function closePrestamo(id_prestamo: string) {
  return getOne(
    `UPDATE prestamos
     SET fecha_cierre_total = NOW(),
         estado_general = 'devuelto'
     WHERE id_prestamo = $1
     RETURNING *`,
    [id_prestamo]
  );
}

/** Marcar detalle como devuelto */
export async function markDetalleDevuelto(
  id_detalle: string,
  observacion_devolucion?: string
) {
  return getOne(
    `UPDATE detalles_prestamo
     SET esta_devuelto = TRUE,
         observacion_devolucion = $2
     WHERE id_detalle = $1
     RETURNING *`,
    [id_detalle, observacion_devolucion || null]
  );
}

/** Obtener préstamo completo con detalles (JOIN 4 tablas) */
export async function getPrestamoCompleto(id_prestamo: string) {
  return getOne(
    `SELECT
       p.*,
       pe.nombre_completo as estudiante_nombre,
       pe.cedula as estudiante_cedula,
       pe.correo_institucional as estudiante_correo,
       pe.programa_academico as estudiante_programa,
       pe.telefono as estudiante_telefono,
       pm.nombre_completo as monitor_nombre
     FROM prestamos p
     JOIN perfiles pe ON p.id_estudiante = pe.id_perfil
     LEFT JOIN perfiles pm ON p.id_monitor_validador = pm.id_perfil
     WHERE p.id_prestamo = $1`,
    [id_prestamo]
  );
}

/** Obtener detalles de un préstamo con datos del activo */
export async function getDetallesPrestamo(id_prestamo: string) {
  return getAll(
    `SELECT
       dp.*,
       a.nombre_activo as activo_nombre,
       a.codigo_qr as activo_codigo_qr,
       a.tipo as activo_tipo,
       a.estado as activo_estado,
       c.nombre_categoria as categoria_nombre
     FROM detalles_prestamo dp
     JOIN activos a ON dp.id_activo = a.id_activo
     LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
     WHERE dp.id_prestamo = $1`,
    [id_prestamo]
  );
}

// ============ REPORTES ============

/** Préstamos activos con mora (RF-14, RF-17) */
export async function getPrestamosEnMora() {
  return getAll(
    `SELECT
       p.*,
       pe.nombre_completo as estudiante_nombre,
       pe.cedula as estudiante_cedula,
       pe.correo_institucional as estudiante_correo,
       pe.programa_academico as estudiante_programa,
       pe.telefono as estudiante_telefono
     FROM prestamos p
     JOIN perfiles pe ON p.id_estudiante = pe.id_perfil
     WHERE p.fecha_limite + INTERVAL '8 days' < NOW()
       AND p.estado_general = 'activo'
     ORDER BY p.fecha_limite ASC`
  );
}

/** Dashboard stats (RF-20) */
export async function getDashboardStats() {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM activos) as total_activos,
       (SELECT COUNT(*) FROM activos WHERE estado = 'disponible') as activos_disponibles,
       (SELECT COUNT(*) FROM activos WHERE estado = 'prestado') as activos_prestados,
       (SELECT COUNT(*) FROM activos WHERE estado = 'dañado') as activos_danados,
       (SELECT COUNT(*) FROM activos WHERE estado = 'mantenimiento') as activos_mantenimiento,
       (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'activo') as prestamos_activos,
       (SELECT COUNT(*) FROM prestamos WHERE estado_general = 'devuelto') as prestamos_devueltos,
       (SELECT COUNT(*) FROM prestamos WHERE fecha_limite + INTERVAL '8 days' < NOW() AND estado_general = 'activo') as estudiantes_en_mora`
  );
  return result.rows[0];
}

// ============ CATEGORÍAS ============

export async function getAllCategorias() {
  return getAll("SELECT * FROM categorias ORDER BY nombre_categoria");
}

export async function createCategoria(data: {
  nombre_categoria: string;
  descripcion_categoria?: string;
}) {
  return getOne(
    `INSERT INTO categorias (nombre_categoria, descripcion_categoria)
     VALUES ($1, $2)
     RETURNING *`,
    [data.nombre_categoria, data.descripcion_categoria || null]
  );
}

// --- Cierre de conexión (para graceful shutdown) ---
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined as any;
    console.log("[DB] Pool cerrado.");
  }
}

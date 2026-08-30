/**
 * cadena.ts — Registro de trazabilidad encadenado en PostgreSQL
 * (Opción A: simulación con Node — cero gas, infinitas operaciones)
 *
 * Cada eslabón guarda: tipo, préstamo, estudiante, monitor, activo,
 * estado, ubicación, fecha — y su hash keccak256 liga al anterior (prev_hash).
 * Si alguien modifica un registro del pasado, la cadena se rompe.
 *
 * El contrato de Amoy y las funciones on-chain de lib/polygon.ts quedan
 * intactos como respaldo (ver docs/ANCLAJE_AMOY.md para anclar la cadena).
 */

import { ethers } from "ethers";
import { getPool } from "@/lib/db";

export interface EslabonData {
  assetHash: string;
  id_activo: string;
  estado: string;
  ubicacion: string;
}

interface Registro extends EslabonData {
  tipo: "loan" | "return";
  id_prestamo: string;
  id_estudiante: string;
  id_monitor: string;
  loan_hash: string;
  student_hash: string;
  monitor_hash: string;
}

/** Hash del monitor (nunca su identidad real en claro). */
export function computeMonitorHash(monitorId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`monitor:${monitorId}`));
}

/** Hash encadenado: liga el registro al anterior (prev_hash). */
function hashRegistro(reg: Registro, prevHash: string | null, fecha: Date): string {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      `${reg.tipo}|${reg.loan_hash}|${reg.assetHash}|${reg.student_hash}|${reg.monitor_hash}|${reg.estado}|${reg.ubicacion}|${fecha.toISOString()}|${prevHash || "GENESIS"}`
    )
  );
}

/**
 * Registra movimientos en la cadena. Devuelve los hash_registro generados
 * (uno por activo), en el mismo formato que antes se usaba para tx hashes.
 */
export async function registrarEnCadena(
  tipo: "loan" | "return",
  id_prestamo: string,
  loanHash: string,
  items: EslabonData[],
  studentHash: string,
  idEstudiante: string,
  idMonitor: string
): Promise<string[]> {
  if (items.length === 0) return [];
  const pool = getPool();

  // Último eslabón de la cadena
  const last = await pool.query(
    "SELECT hash_registro FROM registro_blockchain ORDER BY id_registro DESC LIMIT 1"
  );
  let prevHash: string | null = last.rows.length > 0 ? last.rows[0].hash_registro : null;

  const monitorHash = computeMonitorHash(idMonitor);
  const hashes: string[] = [];

  for (const item of items) {
    const reg: Registro = {
      tipo,
      id_prestamo,
      id_estudiante: idEstudiante,
      id_monitor: idMonitor,
      loan_hash: loanHash,
      student_hash: studentHash,
      monitor_hash: monitorHash,
      assetHash: item.assetHash,
      id_activo: item.id_activo,
      estado: item.estado,
      ubicacion: item.ubicacion,
    };
    const fecha = new Date();
    const hash = hashRegistro(reg, prevHash, fecha);

    await pool.query(
      `INSERT INTO registro_blockchain
         (tipo, id_prestamo, id_estudiante, id_monitor, id_activo, loan_hash, asset_hash, student_hash, monitor_hash, estado, ubicacion, prev_hash, hash_registro, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [tipo, id_prestamo, idEstudiante, idMonitor, item.id_activo, loanHash, item.assetHash, studentHash, monitorHash, item.estado, item.ubicacion, prevHash, hash, fecha]
    );

    hashes.push(hash);
    prevHash = hash; // el siguiente eslabón apunta a este
  }
  return hashes;
}

/** Verifica la integridad de toda la cadena. */
export async function verificarCadena(): Promise<{ ok: boolean; registros: number; rotoEn?: number }> {
  const pool = getPool();
  const res = await pool.query(
    "SELECT id_registro, prev_hash, hash_registro FROM registro_blockchain ORDER BY id_registro ASC"
  );
  const rows = res.rows;
  for (let i = 0; i < rows.length; i++) {
    const expectPrev = i === 0 ? null : rows[i - 1].hash_registro;
    if (rows[i].prev_hash !== expectPrev) {
      return { ok: false, registros: rows.length, rotoEn: rows[i].id_registro };
    }
  }
  return { ok: true, registros: rows.length };
}

/** Eventos recientes para el dashboard. */
export async function getEventosRecientes(limit = 5) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT r.tipo, r.asset_hash, r.loan_hash, r.student_hash, r.hash_registro, r.fecha, a.nombre_activo
     FROM registro_blockchain r
     LEFT JOIN activos a ON a.id_activo = r.id_activo
     ORDER BY r.id_registro DESC LIMIT $1`,
    [limit]
  );
  return res.rows.map(r => ({
    event: r.tipo === "loan" ? "Prestamo" : "Devolucion",
    assetHash: r.asset_hash,
    loanHash: r.loan_hash,
    studentHash: r.student_hash,
    hash: r.hash_registro,
    activo: r.nombre_activo || "",
    timestamp: r.fecha.toLocaleString("es-CO"),
  }));
}

/** Libro contable: eslabones paginados con nombres resueltos. */
export async function getCadena(page = 1, limit = 30, busqueda = "") {
  const pool = getPool();
  const offset = (page - 1) * limit;
  const q = busqueda.trim();
  const whereFor = (i: number) => q
    ? `WHERE a.nombre_activo ILIKE '%' || $${i} || '%' OR pe.nombre_completo ILIKE '%' || $${i} || '%'`
    : "";

  const totalRes = await pool.query(
    `SELECT count(*) FROM registro_blockchain r
     LEFT JOIN activos a ON a.id_activo = r.id_activo
     LEFT JOIN perfiles pe ON pe.id_perfil = r.id_estudiante ${whereFor(1)}`,
    q ? [q] : []
  );

  const res = await pool.query(
    `SELECT r.id_registro, r.tipo, r.estado, r.ubicacion, r.asset_hash, r.loan_hash,
            r.student_hash, r.monitor_hash,
            r.hash_registro, r.prev_hash, r.fecha,
            a.nombre_activo,
            pe.nombre_completo AS estudiante_nombre,
            pm.nombre_completo AS monitor_nombre
     FROM registro_blockchain r
     LEFT JOIN activos a ON a.id_activo = r.id_activo
     LEFT JOIN perfiles pe ON pe.id_perfil = r.id_estudiante
     LEFT JOIN perfiles pm ON pm.id_perfil = r.id_monitor
     ${whereFor(3)}
     ORDER BY r.id_registro DESC
     LIMIT $1::int OFFSET $2::int`,
    q ? [limit, offset, q] : [limit, offset]
  );

  return {
    total: Number(totalRes.rows[0].count),
    pagina: page,
    limite: limit,
    items: res.rows,
  };
}

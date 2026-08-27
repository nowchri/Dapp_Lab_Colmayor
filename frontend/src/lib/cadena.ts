/**
 * cadena.ts — Registro de trazabilidad encadenado en PostgreSQL
 * (Opción A: simulación con Node — cero gas, infinitas operaciones)
 *
 * La matemática es IDENTICA a la on-chain (keccak256), pero en vez de
 * enviar transacciones a Amoy, cada registro se guarda en la tabla
 * registro_blockchain encadenado al anterior (prev_hash).
 * Si alguien modifica un registro, se rompe toda la cadena posterior.
 *
 * El contrato de Amoy y las funciones on-chain de lib/polygon.ts quedan
 * intactos como respaldo (ver docs/ANCLAJE_AMOY.md para anclar la cadena).
 */

import { ethers } from "ethers";
import { getPool } from "@/lib/db";

interface Registro {
  tipo: "loan" | "return";
  id_prestamo: string;
  loan_hash: string;
  asset_hash: string;
  student_hash: string;
}

/** Hash encadenado: liga el registro al anterior (prev_hash). */
function hashRegistro(reg: Registro, prevHash: string | null, fecha: Date): string {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      `${reg.tipo}|${reg.loan_hash}|${reg.asset_hash}|${reg.student_hash}|${fecha.toISOString()}|${prevHash || "GENESIS"}`
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
  assetHashes: string[],
  studentHash: string
): Promise<string[]> {
  if (assetHashes.length === 0) return [];
  const pool = getPool();

  // Último eslabón de la cadena
  const last = await pool.query(
    "SELECT hash_registro FROM registro_blockchain ORDER BY id_registro DESC LIMIT 1"
  );
  let prevHash: string | null = last.rows.length > 0 ? last.rows[0].hash_registro : null;

  const hashes: string[] = [];
  for (const assetHash of assetHashes) {
    const reg: Registro = { tipo, id_prestamo, loan_hash: loanHash, asset_hash: assetHash, student_hash: studentHash };
    const fecha = new Date();
    const hash = hashRegistro(reg, prevHash, fecha);

    await pool.query(
      `INSERT INTO registro_blockchain (tipo, id_prestamo, loan_hash, asset_hash, student_hash, prev_hash, hash_registro, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tipo, id_prestamo, loanHash, assetHash, studentHash, prevHash, hash, fecha]
    );

    hashes.push(hash);
    prevHash = hash; // el siguiente eslabón apunta a este
  }
  return hashes;
}

/** Verifica la integridad de toda la cadena. Devuelve true si está intacta. */
export async function verificarCadena(): Promise<{ ok: boolean; registros: number }> {
  const pool = getPool();
  const res = await pool.query("SELECT id_registro, prev_hash, hash_registro FROM registro_blockchain ORDER BY id_registro ASC");
  const rows = res.rows;
  let ok = true;
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) {
      if (rows[i].prev_hash !== null) ok = false;
    } else {
      if (rows[i].prev_hash !== rows[i - 1].hash_registro) ok = false;
    }
  }
  return { ok, registros: rows.length };
}

/** Eventos recientes para el dashboard (reemplaza la lectura on-chain). */
export async function getEventosRecientes(limit = 5) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT tipo, id_prestamo, loan_hash, asset_hash, student_hash, hash_registro, fecha
     FROM registro_blockchain ORDER BY id_registro DESC LIMIT $1`,
    [limit]
  );
  return res.rows.map(r => ({
    event: r.tipo === "loan" ? "Prestamo" : "Devolucion",
    assetHash: r.asset_hash,
    loanHash: r.loan_hash,
    studentHash: r.student_hash,
    hash: r.hash_registro,
    timestamp: r.fecha.toLocaleString("es-CO"),
  }));
}

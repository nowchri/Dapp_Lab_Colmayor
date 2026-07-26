// ============================================================
// Funciones de validación puras — DApp Lab IUCMC
// Actualizado: regex @unimayor.edu.co, mora Just-in-Time (D1, D2).
// ============================================================

import { EMAIL_INSTITUCIONAL_REGEX, DIAS_GRACIA_MORA, BLOQUEO_POR_MORA_DEFAULT } from "./constants";

// --- Validación de correo institucional (RF-18 / D2 RESUELTO) ---

/**
 * Valida que el correo cumpla con @unimayor.edu.co.
 */
export function validateEmailInstitucional(email: string): {
  valid: boolean;
  message: string;
} {
  if (!email || email.trim().length === 0) {
    return { valid: false, message: "El correo institucional es requerido." };
  }

  if (!EMAIL_INSTITUCIONAL_REGEX.test(email.trim())) {
    return {
      valid: false,
      message: "El correo debe ser institucional (@unimayor.edu.co). Ej: nombre@unimayor.edu.co",
    };
  }

  return { valid: true, message: "" };
}

// --- Validación de duplicados (RF-18) ---

export function isDuplicateAsset(
  nombre: string,
  codigo_qr: string | undefined,
  existingNames: string[],
  existingQRs: string[]
): { duplicate: boolean; field: string; message: string } {
  const nombreLower = nombre.toLowerCase().trim();

  if (existingNames.some((n) => n.toLowerCase().trim() === nombreLower)) {
    return {
      duplicate: true,
      field: "nombre_activo",
      message: `Ya existe un activo con el nombre "${nombre}".`,
    };
  }

  if (
    codigo_qr &&
    existingQRs.some((q) => q.toLowerCase().trim() === codigo_qr.toLowerCase().trim())
  ) {
    return {
      duplicate: true,
      field: "codigo_qr",
      message: `Ya existe un activo con el código QR "${codigo_qr}".`,
    };
  }

  return { duplicate: false, field: "", message: "" };
}

// --- Mora Just-in-Time (D1 + D8 RESUELTO) ---

/**
 * Calcula si un préstamo está en mora comparando fecha_limite vs NOW().
 * No depende de un campo estático — es Just-in-Time.
 *
 * D8: El Cron Job SOLO envía correos de alerta.
 *     El bloqueo se determina AQUÍ, en el momento del préstamo.
 *
 * @param fechaLimite — fecha_limite del préstamo (ISO string o Date)
 * @param now — fecha actual (default: new Date())
 * @returns días en mora (> 0 = excedió fecha_limite + gracia)
 */
export function calcularDiasMora(fechaLimite: string | Date, now?: Date): number {
  const hoy = now || new Date();
  const limite = typeof fechaLimite === "string" ? new Date(fechaLimite) : fechaLimite;
  const fechaGracia = new Date(limite);
  fechaGracia.setDate(fechaGracia.getDate() + DIAS_GRACIA_MORA);

  if (hoy <= fechaGracia) {
    return 0;
  }

  const diffMs = hoy.getTime() - fechaGracia.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determina si un préstamo está en mora.
 * Validación Just-in-Time contra NOW().
 */
export function estaEnMora(fechaLimite: string | Date, now?: Date): boolean {
  return calcularDiasMora(fechaLimite, now) > 0;
}

/**
 * D1 + D8: Validación de bloqueo Just-in-Time.
 *
 * El flujo es:
 * 1. Estudiante escanea QR.
 * 2. Sistema ejecuta: SELECT COUNT(*) FROM prestamos WHERE id_estudiante = ?
 *    AND fecha_limite < NOW() AND estado_general = 'activo'.
 * 3. Si count > 0 Y toggle activo → mostrar "Acceso bloqueado".
 * 4. Se deshabilita el botón "Confirmar Contrato".
 *
 * @param prestamosActivosVencidos — COUNT de préstamos activos vencidos del estudiante
 * @param toggleActivo — si el toggle de bloqueo está activo (configurable)
 * @returns si debe bloquearse y el mensaje
 */
export function validarBloqueoJustInTime(
  prestamosActivosVencidos: number,
  toggleActivo: boolean = BLOQUEO_POR_MORA_DEFAULT
): { bloqueado: boolean; message: string } {
  if (!toggleActivo) {
    return { bloqueado: false, message: "" };
  }

  if (prestamosActivosVencidos > 0) {
    return {
      bloqueado: true,
      message:
        "🚨 Acceso bloqueado: Tienes material pendiente por entregar " +
        `con más de ${DIAS_GRACIA_MORA} días de retraso. ` +
        "Devuelve el material para poder solicitar nuevos préstamos.",
    };
  }

  return { bloqueado: false, message: "" };
}

// --- Validación de bolsa de préstamo (RF-08) ---

export function validateLoanCart(
  items: { id_activo: string; cantidad_entregada: number }[]
): { valid: boolean; message: string } {
  if (!items || items.length === 0) {
    return {
      valid: false,
      message: "La bolsa de préstamo no puede estar vacía. Agrega al menos un activo.",
    };
  }

  const invalidQuantities = items.filter((a) => a.cantidad_entregada < 1);
  if (invalidQuantities.length > 0) {
    return {
      valid: false,
      message: "Todas las cantidades deben ser al menos 1.",
    };
  }

  return { valid: true, message: "" };
}

// --- Validación de fecha límite ---

export function validateFechaLimite(
  fechaLimite: string
): { valid: boolean; message: string } {
  const fecha = new Date(fechaLimite);
  const ahora = new Date();

  if (isNaN(fecha.getTime())) {
    return { valid: false, message: "La fecha límite no es válida." };
  }

  if (fecha <= ahora) {
    return {
      valid: false,
      message: "La fecha límite debe ser posterior a hoy.",
    };
  }

  return { valid: true, message: "" };
}

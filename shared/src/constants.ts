// ============================================================
// Constantes de negocio — DApp Lab IUCMC
// Actualizado con decisiones resueltas (2026-07-22).
// ============================================================

// --- Roles (RF-02) ---
export const ROLES = {
  ESTUDIANTE: "estudiante" as const,
  MONITOR: "monitor" as const,
  ADMIN: "admin" as const,
} as const;

export const ROLE_LABELS: Record<string, string> = {
  estudiante: "Estudiante",
  monitor: "Monitor",
  admin: "Administrador",
};

// --- Estados de activo (RF-07) ---
export const ASSET_STATUS = {
  DISPONIBLE: "disponible" as const,
  PRESTADO: "prestado" as const,
  DANADO: "dañado" as const,
  MANTENIMIENTO: "mantenimiento" as const,
  INCOMPLETO: "incompleto" as const,
} as const;

export const ASSET_STATUS_LABELS: Record<string, string> = {
  disponible: "✅ Disponible",
  prestado: "📦 Prestado",
  "dañado": "⚠️ Dañado",
  mantenimiento: "🔧 En Mantenimiento",
  incompleto: "🧩 Incompleto — Faltan componentes",
};

// --- Estados de préstamo ---
export const LOAN_STATUS = {
  PENDIENTE: "pendiente" as const,
  ACTIVO: "activo" as const,
  DEVUELTO: "devuelto" as const,
  MORA: "mora" as const,
  CANCELADO: "cancelado" as const,
} as const;

export const LOAN_STATUS_LABELS: Record<string, string> = {
  pendiente: "⏳ Pendiente de aprobación",
  activo: "📦 Activo",
  devuelto: "✅ Devuelto",
  mora: "🚨 EN MORA",
  cancelado: "❌ Cancelado",
};

// --- Tipos de activo (RF-22) ---
export const ASSET_TYPE = {
  TRAZABLE: "trazable" as const,
  CONSUMIBLE: "consumible" as const,
} as const;

export const ASSET_TYPE_LABELS: Record<string, string> = {
  trazable: "Trazable (QR individual)",
  consumible: "Consumible (por stock)",
};

// --- Reglas de negocio ---

// Periodo de gracia para mora (Regla 4): 8 días calendario
export const DIAS_GRACIA_MORA = 8;

// ⚠️ D1 RESUELTO: Bloqueo por mora es CONFIGURABLE (toggle on/off).
// Validación Just-in-Time (no campo estático).
// El toggle se persiste en tabla de configuración o variable de entorno.
export const BLOQUEO_POR_MORA_DEFAULT = true; // Activado por defecto

// --- Regex (D2 RESUELTO) ---
// Validación de correo institucional @unimayor.edu.co
export const EMAIL_INSTITUCIONAL_REGEX = /^[a-zA-Z0-9._%+-]+@unimayor\.edu\.co$/;

// --- Colores institucionales (D6 RESUELTO) ---
// Proporcionados: principal #09488D, contraste #FFFFFF, acento #F7C800
export const COLORES_INSTITUCIONALES = {
  primary: "#09488D",
  white: "#FFFFFF",
  accent: "#F7C800",
} as const;

// --- Nombres de íconos (D7 RESUELTO: Lucide, el más simple) ---
export const CATALOG_ICONS = [
  "Cpu", "CircuitBoard", "Cable", "Gauge", "Lightbulb",
  "Battery", "Resistor", "Wrench", "Box", "BookOpen",
  "Wifi", "Camera", "HardDrive", "Usb", "Radio",
] as const;

export const DEFAULT_ICON_BY_CATEGORY: Record<string, string> = {
  "Sistemas Embebidos": "Cpu",
  "Sensores": "Gauge",
  "Actuadores": "Lightbulb",
  "Cables": "Cable",
  "Herramientas": "Wrench",
  "Kits": "Box",
  "Documentación": "BookOpen",
  "Comunicación": "Wifi",
  "Almacenamiento": "HardDrive",
  "Fuentes": "Battery",
};

// --- Conexión PostgreSQL (BD local) ---
export const DATABASE_URL = process.env.DATABASE_URL ||
  "postgresql://postgres:1234@localhost:5432/Bd_laboratorio";

// --- Polygon Amoy (E2 RESUELTO) ---
export const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL ||
  "https://polygon-amoy.g.alchemy.com/v2/alch_Iz_Z3n06ZnpaR0nj-vDFW";

// --- Smart Contract ---
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

// --- Email (E5 RESUELTO) ---
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ||
  "api_no_disponible";
export const EMAIL_FROM = process.env.EMAIL_FROM || "cristian_santiago@unimayor.edu.co";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "testpruea2@unimayor.edu.co";
export const DECANATURA_EMAIL = process.env.DECANATURA_EMAIL || "testpruea2@unimayor.edu.co";

// ============================================================
// Tipos compartidos — DApp Lab IUCMC
// Reflejan EXACTAMENTE el schema PostgreSQL local.
// Base de datos: postgresql://postgres:1234@localhost:5432/Bd_laboratorio
// ============================================================

// --- ENUMs de PostgreSQL ---

// CREATE TYPE rol_usuario AS ENUM ('estudiante', 'monitor', 'admin')
export type UserRole = "estudiante" | "monitor" | "admin";

// CREATE TYPE estado_activo AS ENUM ('disponible', 'prestado', 'dañado', 'mantenimiento', 'incompleto')
export type AssetStatus = "disponible" | "prestado" | "dañado" | "mantenimiento" | "incompleto";

// CREATE TYPE tipo_activo AS ENUM ('trazable', 'consumible')
export type AssetType = "trazable" | "consumible";

// CREATE TYPE estado_prestamo AS ENUM ('activo', 'devuelto', 'mora') — + 'pendiente' para solicitudes no aprobadas
export type LoanStatus = "pendiente" | "activo" | "devuelto" | "mora" | "cancelado";

// ============================================================
// Tabla: perfiles (Registro Único)
// Columnas del schema PostgreSQL (snake_case)
// ============================================================
export interface Perfil {
  id_perfil: string;                    // UUID PK DEFAULT gen_random_uuid()
  codigo_estudiantil: string;           // VARCHAR(20) UNIQUE NOT NULL
  cedula: string;                       // VARCHAR(20) UNIQUE NOT NULL (dato sensible — RNF-06)
  nombre_completo: string;              // TEXT NOT NULL
  correo_institucional: string;          // TEXT UNIQUE NOT NULL — validado regex @unimayor.edu.co
  programa_academico: string | null;    // TEXT
  telefono: string | null;              // VARCHAR(15) (dato sensible — RNF-06)
  rol: UserRole;                        // rol_usuario DEFAULT 'estudiante'
  wallet_address: string | null;        // TEXT — para firma server-side
  created_at: string;                   // TIMESTAMP WITH TIME ZONE DEFAULT NOW()
}

// ============================================================
// Tabla: categorias
// ============================================================
export interface Categoria {
  id_categoria: string;                 // UUID PK
  nombre_categoria: string;             // TEXT NOT NULL
  descripcion_categoria: string | null; // TEXT
}

// ============================================================
// Tabla: activos (Soporta Kits e Individuales)
// Relación recursiva: id_activo_padre → Kit padre
// ============================================================
export interface Activo {
  id_activo: string;                    // UUID PK
  codigo_qr: string | null;             // VARCHAR(50) UNIQUE — NULL para consumibles
  nombre_activo: string;                // TEXT NOT NULL
  id_categoria: string | null;          // UUID FK → categorias
  id_activo_padre: string | null;       // UUID FK → activos (relación recursiva para Kits)
  tipo: AssetType;                      // tipo_activo DEFAULT 'trazable'
  estado: AssetStatus;                  // estado_activo DEFAULT 'disponible'
  foto_url: string | null;              // TEXT — placeholder para futuro (D7)
  observaciones_iniciales: string | null;
}

// ============================================================
// Tabla: prestamos (Cabecera de la Bolsa)
// ============================================================
export interface Prestamo {
  id_prestamo: string;                  // UUID PK
  id_estudiante: string;                // UUID FK → perfiles
  id_monitor_validador: string;         // UUID FK → perfiles (quien aprobó)
  fecha_inicio: string;                 // TIMESTAMPTZ DEFAULT NOW()
  fecha_limite: string;                 // TIMESTAMPTZ NOT NULL (definida por el estudiante)
  fecha_cierre_total: string | null;    // TIMESTAMPTZ — cuando se devuelve todo
  materia: string | null;
  profesor_encargado: string | null;
  curso_grupo: string | null;
  blockchain_hash: string | null;       // TEXT UNIQUE — el sello inmutable de Polygon (RF-10)
  estado_general: LoanStatus;           // estado_prestamo DEFAULT 'activo'
}

// ============================================================
// Tabla: detalles_prestamo (Los ítems de la Bolsa)
// ============================================================
export interface DetallePrestamo {
  id_detalle: string;                   // UUID PK
  id_prestamo: string;                  // UUID FK → prestamos ON DELETE CASCADE
  id_activo: string;                    // UUID FK → activos
  cantidad_entregada: number;           // INTEGER DEFAULT 1
  observacion_entrega: string | null;
  observacion_devolucion: string | null;
  esta_devuelto: boolean;               // BOOLEAN DEFAULT FALSE
}

// ============================================================
// Vistas compuestas para UI (JOINs frecuentes)
// ============================================================

// Préstamo completo con sus detalles (join prestamos + detalles_prestamo + activos + perfiles)
export interface PrestamoCompleto extends Prestamo {
  // Datos denormalizados del estudiante (JOIN perfiles)
  estudiante_nombre: string;
  estudiante_cedula: string;
  estudiante_correo: string;
  estudiante_programa: string | null;
  estudiante_telefono: string | null;
  // Datos del monitor (JOIN perfiles)
  monitor_nombre: string;
  // Detalles de la bolsa (JOIN detalles_prestamo + activos)
  detalles: DetallePrestamoConActivo[];
  // Calculado: días de mora
  dias_mora: number;
  // Calculado: ¿está en mora?
  en_mora: boolean;
}

export interface DetallePrestamoConActivo extends DetallePrestamo {
  // Datos del activo (JOIN activos)
  activo_nombre: string;
  activo_codigo_qr: string | null;
  activo_tipo: AssetType;
  activo_estado: AssetStatus;
  categoria_nombre: string | null;
}

// Activo con su categoría y relación de kit
export interface ActivoCompleto extends Activo {
  categoria_nombre: string | null;
  kit_nombre: string | null;           // Nombre del kit padre, si aplica
  componentes_count: number;           // Cuántos componentes hijos tiene (si es kit padre)
}

// ============================================================
// DTOs para API Routes (CRUD)
// ============================================================

// Registro de estudiante (RF-01)
export interface RegisterEstudianteDTO {
  codigo_estudiantil: string;
  cedula: string;
  nombre_completo: string;
  correo_institucional: string;
  programa_academico?: string;
  telefono?: string;
}

// Solicitud de préstamo (bolsa — RF-08)
export interface CreateLoanDTO {
  id_estudiante: string;
  items: CreateLoanItemDTO[];
  fecha_limite: string;                // Definida por el estudiante (Regla 4)
  materia?: string;
  profesor_encargado?: string;
  curso_grupo?: string;
  condiciones_aceptadas: boolean;      // RF-05: cláusulas
}

export interface CreateLoanItemDTO {
  id_activo: string;
  cantidad_entregada: number;
  observacion_entrega?: string;
}

// Aprobación de préstamo (monitor — RF-09)
export interface ApproveLoanDTO {
  id_prestamo: string;
  id_monitor_validador: string;
}

// Devolución — RF-11
export interface ReturnLoanDTO {
  id_prestamo: string;
  items_devueltos: ReturnLoanItemDTO[];
  observaciones_generales?: string;
}

export interface ReturnLoanItemDTO {
  id_detalle: string;
  esta_devuelto: boolean;
  observacion_devolucion?: string;
}

// Registro de activo — RF-16
export interface RegisterAssetDTO {
  codigo_qr?: string;                  // Solo trazables
  nombre_activo: string;
  id_categoria?: string;
  id_activo_padre?: string;            // Si es componente de un kit
  tipo: AssetType;
  observaciones_iniciales?: string;
}

// Dashboard stats — RF-20
export interface DashboardStats {
  total_activos: number;
  activos_disponibles: number;
  activos_prestados: number;
  activos_danados: number;
  activos_mantenimiento: number;
  prestamos_activos: number;
  prestamos_devueltos: number;
  estudiantes_en_mora: number;
  categorias_mas_usadas: { categoria: string; count: number }[];
  activos_mas_prestados: { id_activo: string; nombre_activo: string; count: number }[];
}

// Reporte de decanatura — RF-12
export interface ReporteDecanaturaItem {
  estudiante_nombre: string;
  estudiante_cedula: string;
  estudiante_telefono: string | null;
  estudiante_programa: string | null;
  materiales_pendientes: string[];     // Nombres de activos no devueltos
  materia: string | null;
  curso_grupo: string | null;
  profesor_encargado: string | null;
  fecha_inicio: string;
  fecha_limite: string;
  dias_mora: number;
}

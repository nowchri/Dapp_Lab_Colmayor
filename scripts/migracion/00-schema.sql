-- ============================================================
-- Esquema destino (Neon) — réplica exacta del esquema de producción
-- Fuente de verdad: scripts/supabase_dump.sql (DDL) + DOCUMENTACION_TECNICA.md §5.2
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Enums ----------
DO $$ BEGIN CREATE TYPE rol_usuario    AS ENUM ('estudiante','monitor','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_activo    AS ENUM ('trazable','consumible'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE estado_activo  AS ENUM ('disponible','prestado','dañado','mantenimiento','incompleto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE estado_prestamo AS ENUM ('pendiente','activo','devuelto','rechazado','mora'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Catálogo ----------
CREATE TABLE IF NOT EXISTS areas (
  id_area       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_area   text NOT NULL UNIQUE,
  descripcion   text
);

CREATE TABLE IF NOT EXISTS categorias (
  id_categoria           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_area                uuid NOT NULL REFERENCES areas(id_area),
  nombre_categoria       text NOT NULL,
  descripcion_categoria  text,
  UNIQUE (id_area, nombre_categoria)
);

CREATE TABLE IF NOT EXISTS configuracion (
  clave text PRIMARY KEY,
  valor text
);

-- ---------- Identidad ----------
CREATE TABLE IF NOT EXISTS perfiles (
  id_perfil             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_estudiantil    varchar NOT NULL UNIQUE,
  cedula                varchar NOT NULL UNIQUE,
  nombre_completo       text NOT NULL,
  correo_institucional  text NOT NULL UNIQUE,
  programa_academico    text,
  telefono              varchar,
  rol                   rol_usuario DEFAULT 'estudiante'::rol_usuario,
  wallet_address        text,
  created_at            timestamptz DEFAULT now(),
  password_hash         text
);

-- ---------- Inventario ----------
CREATE TABLE IF NOT EXISTS activos (
  id_activo                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_qr                varchar UNIQUE,
  nombre_activo            text NOT NULL,
  id_categoria             uuid REFERENCES categorias(id_categoria),
  id_activo_padre          uuid REFERENCES activos(id_activo),
  tipo                     tipo_activo DEFAULT 'trazable'::tipo_activo,
  estado                   estado_activo DEFAULT 'disponible'::estado_activo,
  foto_url                 text,
  observaciones_iniciales  text,
  stock_actual             int4 DEFAULT 0
);

-- ---------- Préstamos ----------
CREATE TABLE IF NOT EXISTS prestamos (
  id_prestamo           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_estudiante         uuid NOT NULL REFERENCES perfiles(id_perfil),
  id_monitor_validador  uuid REFERENCES perfiles(id_perfil),
  fecha_inicio          timestamptz DEFAULT now(),
  fecha_limite          timestamptz NOT NULL,
  fecha_cierre_total    timestamptz,
  materia               text,
  profesor_encargado    text,
  curso_grupo           text,
  blockchain_hash       text UNIQUE,
  estado_general        estado_prestamo DEFAULT 'activo'::estado_prestamo,
  motivo_rechazo        text,
  nombre_docente        text,
  recordatorio_enviado  timestamptz
);

CREATE TABLE IF NOT EXISTS detalles_prestamo (
  id_detalle             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_prestamo            uuid REFERENCES prestamos(id_prestamo) ON DELETE CASCADE,
  id_activo              uuid REFERENCES activos(id_activo),
  cantidad_entregada     int4 DEFAULT 1,
  observacion_entrega    text,
  observacion_devolucion text,
  esta_devuelto          bool DEFAULT false
);

-- ---------- Trazabilidad ----------
CREATE SEQUENCE IF NOT EXISTS registro_blockchain_id_registro_seq;

CREATE TABLE IF NOT EXISTS registro_blockchain (
  id_registro   int8 PRIMARY KEY DEFAULT nextval('registro_blockchain_id_registro_seq'::regclass),
  tipo          varchar NOT NULL CHECK (tipo IN ('loan','return')),
  id_prestamo   uuid NOT NULL,
  loan_hash     text NOT NULL,
  asset_hash    text NOT NULL,
  student_hash  text NOT NULL,
  prev_hash     text,
  hash_registro text NOT NULL UNIQUE,
  fecha         timestamptz DEFAULT now(),
  id_estudiante uuid,
  id_monitor    uuid,
  id_activo     uuid,
  monitor_hash  text,
  estado        text,
  ubicacion     text
);

-- ---------- Sesiones y notificaciones ----------
CREATE TABLE IF NOT EXISTS sesiones (
  sid              text PRIMARY KEY,
  id_perfil        uuid NOT NULL,
  rol              text NOT NULL,
  nombre_completo  text NOT NULL,
  expires          timestamptz NOT NULL,
  created          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_suscripciones (
  id_suscripcion  bigserial PRIMARY KEY,
  id_perfil       uuid NOT NULL,
  endpoint        text NOT NULL UNIQUE,
  p256dh          text NOT NULL,
  auth_key        text NOT NULL,
  user_agent      text,
  creado          timestamptz DEFAULT now(),
  ultimo_uso      timestamptz DEFAULT now()
);

-- ---------- Índices de apoyo (las FK no crean índice en PostgreSQL) ----------
CREATE INDEX IF NOT EXISTS idx_activos_categoria      ON activos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_activos_padre          ON activos(id_activo_padre);
CREATE INDEX IF NOT EXISTS idx_activos_estado         ON activos(estado);
CREATE INDEX IF NOT EXISTS idx_activos_tipo           ON activos(tipo);
CREATE INDEX IF NOT EXISTS idx_detalles_prestamo      ON detalles_prestamo(id_prestamo);
CREATE INDEX IF NOT EXISTS idx_detalles_activo        ON detalles_prestamo(id_activo);
CREATE INDEX IF NOT EXISTS idx_prestamos_estudiante   ON prestamos(id_estudiante);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado       ON prestamos(estado_general);
CREATE INDEX IF NOT EXISTS idx_prestamos_fecha_limite ON prestamos(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_registro_prestamo      ON registro_blockchain(id_prestamo);
CREATE INDEX IF NOT EXISTS idx_registro_activo        ON registro_blockchain(id_activo);
CREATE INDEX IF NOT EXISTS idx_sesiones_expires       ON sesiones(expires);
CREATE INDEX IF NOT EXISTS idx_push_perfil            ON push_suscripciones(id_perfil);

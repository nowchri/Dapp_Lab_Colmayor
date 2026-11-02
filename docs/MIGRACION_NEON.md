# Migración de la base de datos a Neon

**Estado:** completada y en producción.
**Rama:** `feature/migracion-neon`
**Motivo:** Supabase pausa los proyectos gratuitos tras 7 días de baja actividad y solo permite
restaurarlos durante 90 días; después los elimina. Para un laboratorio con uso intermitente
(vacaciones, fin de semestre) eso es un riesgo de pérdida de datos, no una molestia.

---

## 1. Por qué no se migró a NoSQL

La auditoría previa evaluó Firebase (Firestore) como destino. Se descartó por una razón medida
en el código, no por preferencia:

**El proyecto no usa nada específico de Supabase.** Solo usa el driver `pg` con una cadena de
conexión:

```ts
// frontend/src/lib/db.ts — único punto de conexión
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://...";
pool = new Pool({ connectionString: DATABASE_URL, ... });
```

| Dependencia | Uso real |
|---|---|
| `supabase-js` / `@supabase/ssr` | No está en `package.json` |
| Supabase Auth | No: login propio con `bcryptjs` + tabla `sesiones` |
| Supabase Storage | No |
| Supabase Realtime | No: `fetch` + `force-dynamic` |
| RLS | No: se entra como rol `postgres`, que la ignora |

Consecuencia: **cambiar de proveedor de PostgreSQL no requiere tocar código**. Cambiar a un
modelo documental sí habría implicado reescribir 172 puntos de SQL en 33 rutas, rediseñar la
cadena de hashes (`registro_blockchain` depende del orden de una secuencia `int8`), sustituir
los `JOIN` por desnormalización y perder la búsqueda `ILIKE` de trazabilidad. Además habría
invalidado el modelo de datos documentado en `DOCUMENTACION_TECNICA.md` §5.

La migración real terminó siendo: exportar, importar y cambiar una variable de entorno.

---

## 2. Qué se migró

10 tablas, 4 enums y 1 secuencia. Conteos reales al momento del corte:

| Tabla | Filas |
|---|---|
| `activos` | 478 |
| `categorias` | 10 |
| `areas` | 2 |
| `configuracion` | 2 |
| `perfiles` | 6 |
| `prestamos` | 9 |
| `detalles_prestamo` | 17 |
| `registro_blockchain` | 32 |
| `sesiones` | 2 |
| `push_suscripciones` | 2 |

Se conservaron **literalmente** los UUID y todos los hashes (`loan_hash`, `asset_hash`,
`student_hash`, `monitor_hash`, `prev_hash`, `hash_registro`). Esto no es un detalle: los hashes
se calculan a partir de los UUID y de la fecha, y los 419 códigos QR están impresos en stickers
físicos. Regenerar identificadores habría roto la cadena de trazabilidad y los stickers.

---

## 3. Cómo se hizo

Scripts en `scripts/migracion/` (se conservan para auditoría y para repetir el proceso):

| Archivo | Función |
|---|---|
| `00-schema.sql` | Esquema destino completo: enums, 10 tablas, secuencia e índices. Idempotente |
| `01-extract.mjs` | Lee todas las tablas y las exporta a NDJSON + `manifest.json` con conteo y checksum por tabla |
| `02-load.mjs` | Crea el esquema y carga los NDJSON con `ON CONFLICT DO NOTHING` (reejecutable) |
| `03-verify.mjs` | Compara origen y destino por checksum, verifica la cadena y la secuencia |
| `04-smoke-sql.mjs` | Ejecuta los 21 patrones SQL reales de la app contra el destino |

Secuencia ejecutada:

```bash
node scripts/migracion/01-extract.mjs    # Supabase → scripts/migracion/dump/
node scripts/migracion/02-load.mjs       # dump/ → Neon (crea esquema + datos)
node scripts/migracion/03-verify.mjs     # comparación por checksum
node scripts/migracion/04-smoke-sql.mjs  # dialecto y escrituras (con ROLLBACK)
```

`02-load.mjs` ajusta además la secuencia de `registro_blockchain` al máximo `id_registro`, para
que el siguiente eslabón continúe la cadena sin colisiones.

---

## 4. Verificación realizada

| Comprobación | Resultado |
|---|---|
| Contenido de las 10 tablas (checksum SHA-256 fila a fila) | idéntico |
| Cadena de trazabilidad | íntegra, 32 eslabones |
| Secuencia `registro_blockchain` | `last_value` = max(`id_registro`) |
| 21 patrones SQL (joins, `FILTER`, `ILIKE`, `ANY(text[])`, `INTERVAL`, `::date`, enums, `gen_random_uuid`) | 21/21 |
| Escrituras: `INSERT` con enums, `UPDATE` con `GREATEST`, `UPDATE … RETURNING` | correctas, revertidas con `ROLLBACK` |
| `GET /api/inventario` contra Neon (route handler real) | HTTP 200, 445 activos raíz |
| `npm run build` | sin errores |

---

## 5. Configuración de Neon

| Parámetro | Valor | Motivo |
|---|---|---|
| Proyecto | `lab-iu` | — |
| Región | `us-east-2` | La más cercana disponible |
| Cómputo | **0.25 CU** | El plan Free da 100 CU-horas/mes; a 0.25 CU son ~400 h/mes en vez de 100 h a 1 CU |
| Scale to zero | 5 min (no configurable en Free) | Se acepta: despierta solo en ~500 ms |
| Conexión | endpoint `-pooler` + `?sslmode=require` | Serverless (Vercel) y TLS obligatorio |

**El límite que hay que vigilar:** las 100 CU-horas mensuales. Si se agotan, la base deja de
responder hasta el mes siguiente. Con el cómputo fijado en 0.25 CU no se alcanza ni con uso
diario de 8 horas.

`channel_binding=require` **debe quitarse** de la cadena: node-postgres no soporta
SCRAM-SHA-256-PLUS y la descarta (los scripts lo filtran automáticamente).

---

## 6. Operación

- **Verificación de rutina:** `node scripts/migracion/03-verify.mjs`. Sin `ORIGEN_DATABASE_URL`
  en `.env` comprueba la base actual contra el manifest del dump y la integridad de la cadena.
  Para volver a comparar contra el proveedor anterior, añadir `ORIGEN_DATABASE_URL=` a `.env`.
- **Backups:** Neon Free no incluye restauración a un punto en el tiempo (PITR). Conviene un
  `pg_dump -Fc` semanal a disco o Drive. Es la única protección real ante un borrado accidental.
- **Rollback:** devolver `DATABASE_URL` al proveedor anterior en Vercel y redesplegar. La cadena
  de Supabase ya no está en `.env`; se obtiene del dashboard de ese proveedor.

---

## 7. Limpieza asociada

Se eliminaron de la rama los artefactos de Supabase y los scripts de un solo uso ya aplicados:

- `.github/workflows/keep-supabase-alive.yml` — el anti-pausa deja de tener sentido.
  **Se conserva** `recordatorios-push.yml` (llama a `/api/cron/recordatorios` en Vercel).
- `scripts/generar-dump-supabase.mjs`, `scripts/verificar-supabase.mjs`,
  `scripts/supabase_dump.sql` (este último contenía cédulas, correos y hashes bcrypt reales).
- Scripts históricos de consolidación, numeración e inspección ya aplicados a producción.
- Docs de la exploración de Firebase/NoSQL, sustituidos por este documento.

Se conservan `crear-prestamo-prueba.mjs` y `crear-prestamo-activo-prueba.mjs` porque sirven para
probar los flujos de aprobación y de recordatorios sin usar datos reales.

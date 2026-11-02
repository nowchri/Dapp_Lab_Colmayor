# Guía de despliegue — DApp Lab IUCMC

Puesta en marcha local y en producción. Para el detalle de la base de datos, ver
[`MIGRACION_NEON.md`](./MIGRACION_NEON.md); para los pasos exactos de Vercel,
[`DEPLOY_VERCEL.md`](./DEPLOY_VERCEL.md).

---

## 1. Requisitos

- Node.js 20+ y npm
- Git
- Cuenta en Neon (PostgreSQL) y en Vercel
- Cuenta de Gmail con contraseña de aplicación (SMTP)

---

## 2. Local

```bash
git clone https://github.com/nowchri/Dapp_Lab_Colmayor.git
cd Dapp_Lab_Colmayor
npm install

cp frontend/.env.example frontend/.env
# completar DATABASE_URL (Neon, endpoint -pooler, ?sslmode=require),
# SMTP_*, EMAIL_FROM, VAPID_*, CRON_SECRET

npm run dev            # http://localhost:3000
```

Variables: la lista completa y su significado está en `frontend/.env.example`. Solo hay **un**
archivo de entorno (`frontend/.env`), no versionado.

Comprobación rápida de la base:

```bash
node scripts/migracion/03-verify.mjs
```

---

## 3. Base de datos

PostgreSQL gestionado en **Neon**. El esquema completo está en
`scripts/migracion/00-schema.sql` (enums, 10 tablas, secuencia e índices) y es idempotente:
se puede ejecutar sobre una base vacía para levantarla desde cero.

```bash
node scripts/migracion/02-load.mjs --solo-esquema
```

Para cargar datos desde un dump previo, ver `MIGRACION_NEON.md` §3.

---

## 4. Producción (Vercel)

1. Importar el repositorio en Vercel. **Root Directory: `frontend`**.
2. Cargar las variables de entorno (Production y Preview) — tabla completa en
   `DEPLOY_VERCEL.md` §3.
3. Deploy. La URL queda como `https://<proyecto>.vercel.app`.
4. **Redeploy obligatorio** cada vez que se cambia una variable de entorno: los valores no se
   aplican a deployments existentes.

---

## 5. Verificación post-deploy

1. Login con una cuenta admin o monitor.
2. `/inventario` muestra los activos (478 al momento de la migración).
3. Solicitar un préstamo → aprobar → aparece el eslabón en `/trazabilidad`.
4. Devolver → el activo vuelve a `disponible` y el préstamo a `devuelto`.
5. Descargar un reporte (CSV) y comprobar acentos.

---

## 6. Recordatorios push

El workflow `.github/workflows/recordatorios-push.yml` corre a diario (13:00 UTC = 8:00 COT) y
llama a `POST /api/cron/recordatorios` con el header `x-cron-secret`. Requiere dos secrets en
GitHub → Settings → Secrets and variables → Actions:

- `APP_URL` — URL de producción en Vercel
- `CRON_SECRET` — el mismo valor de la variable de entorno

Envía **una sola notificación por préstamo, el día antes de vencer**.

---

## 7. Mantenimiento

- **Semanal:** `pg_dump` de respaldo (Neon Free no incluye PITR).
- **Mensual:** revisar en Neon → Usage las CU-horas consumidas y el almacenamiento.
- **Cada semestre:** revisar monitores autorizados y actualizar el inventario por CSV
  (`scripts/importar-csv-v2.mjs`).
- **Antes de cambios grandes:** `node scripts/migracion/03-verify.mjs`.

---

## 8. Notas

- **Nunca** correr `npm run build` con `npm run dev` activo: comparten `.next` y se corrompe el
  runtime del dev. Parar dev → build → re-arrancar.
- Un solo dev server a la vez.
- Los GET de datos vivos usan `export const dynamic = "force-dynamic"` para que Next 14 no los
  cachee en producción.

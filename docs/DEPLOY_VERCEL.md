# Deploy a Vercel — Guía paso a paso

## 1. Subir el repo a GitHub

```bash
cd "D:\U\Proyecto de Grado\Dapp_Lab_Colmayor"
git add -A
git commit -m "chore: migración de la base de datos a Neon"
git push origin feature/migracion-neon
```

> ⚠️ Antes de pushear: confirmá que `frontend/.env` esté en `.gitignore`.
> No se sube ningún secret al repo; los secretos van directo a Vercel.

## 2. Crear el proyecto en Vercel

1. Ir a https://vercel.com → **Add New → Project**
2. Conectar el repo de GitHub (instalar la app de Vercel en GitHub)
3. **Root Directory: `frontend`** (la app es autocontenida)
4. Framework se detecta solo: **Next.js**
5. Build Command: `npm run build` (default) · Output: `.next` (default)

## 3. Configurar Environment Variables

Project → **Settings → Environment Variables** → marcar **Production** y **Preview**:

| Variable | Valor | Tipo |
|---|---|---|
| `DATABASE_URL` | Cadena de Neon con host `-pooler` y `?sslmode=require` | Secreta |
| `SMTP_HOST` | `smtp.gmail.com` | Config |
| `SMTP_PORT` | `465` | Config |
| `SMTP_USER` | cuenta institucional | Secreta |
| `SMTP_PASS` | contraseña de aplicación de Gmail | Secreta |
| `EMAIL_FROM` | remitente de los correos | Config |
| `ADMIN_EMAIL` | correo del administrador | Config |
| `DECANATURA_EMAIL` | correo de decanatura (alertas de mora) | Config |
| `NEXT_PUBLIC_EMAIL_REGEX` | `^[a-zA-Z0-9._%+-]+@unimayor\.edu\.co$` | Pública |
| `VAPID_PUBLIC_KEY` | clave pública VAPID | Secreta |
| `VAPID_PRIVATE_KEY` | clave privada VAPID | Secreta |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | igual que `VAPID_PUBLIC_KEY` | Pública |
| `CRON_SECRET` | secreto del cron de recordatorios | Secreta |
| `POLYGON_RPC_URL` | RPC de Alchemy Amoy (solo respaldo) | Secreta |
| `NEXT_PUBLIC_POLYGON_RPC_URL` | igual que `POLYGON_RPC_URL` | Pública |
| `SERVER_PRIVATE_KEY` | private key de la wallet de respaldo | **Crítica** |
| `SERVER_WALLET_ADDRESS` | dirección de esa wallet | Secreta |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x0E362CF2d81538EBa168F92CB382174d01ab25c1` | Pública |

> `NEXT_PUBLIC_*` se incrusta en el bundle del navegador: solo valores públicos.
> `DATABASE_URL`, `SMTP_PASS`, `VAPID_PRIVATE_KEY`, `SERVER_PRIVATE_KEY` y `CRON_SECRET` nunca
> salen del servidor.

**Sobre `DATABASE_URL`:** copiar la cadena del dashboard de Neon, pestaña *Pooled connection*, y
**quitar `&channel_binding=require`** si aparece. node-postgres no soporta SCRAM-SHA-256-PLUS.

## 4. Deploy

1. Clic en **Deploy**
2. Vercel entrega la URL (`https://<proyecto>.vercel.app`)
3. **Cada vez que se cambia una variable de entorno hay que Redeploy**: los valores no se
   aplican a deployments ya existentes.

Smoke test: login → `/inventario` (478 activos) → crear préstamo → aprobar (aparece el hash en
`/trazabilidad`) → devolver → reporte CSV.

## 5. Recordatorios push (PWA)

1. GitHub → **Settings → Secrets and variables → Actions**:
   - `APP_URL` = URL de producción en Vercel
   - `CRON_SECRET` = el mismo valor de la variable de entorno
2. El workflow `.github/workflows/recordatorios-push.yml` ya está en el repo: todos los días
   llama a `/api/cron/recordatorios`, que envía **una sola notificación por préstamo, el día
   antes de vencer** (o el mismo día si el cron anterior no corrió).
3. En el celular: banner "¿Querés recordatorios?" → Activar → permisos. Instalación como PWA:
   Android *menú → Instalar app*; iPhone *Compartir → Agregar a inicio* (las push en iOS
   requieren app instalada y iOS 16.4+).

## Notas

- **Vercel Hobby:** 100 GB/mes de funciones serverless — de sobra para el laboratorio.
- **Base de datos (Neon Free):** el cómputo se suspende a los 5 minutos de inactividad y
  despierta solo (~500 ms). El plan no expira y no borra proyectos. Vigilar las **100
  CU-horas/mes** con el cómputo fijado en **0.25 CU** (ver `MIGRACION_NEON.md` §5).
- **Backups:** Neon Free no incluye PITR → `pg_dump` semanal propio.
- **Cambios futuros:** cada `git push` a la rama conectada hace deploy automático.

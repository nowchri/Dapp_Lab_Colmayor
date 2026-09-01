# Deploy a Vercel — Guía paso a paso

## 1. Subir el repo a GitHub

```bash
cd "D:\U\Proyecto de Grado\Dapp_Lab_Colmayor"
git add -A
git commit -m "Preparación producción: cadena local, batch, cleanup"
git push origin <rama>
```

> ⚠️ Antes de pushear: confirmá que `frontend/.env` esté en `.gitignore`
> (no se sube NINGÚN secret al repo). Los secrets van directo a Vercel.

## 2. Crear el proyecto en Vercel

1. Ir a https://vercel.com → **Add New → Project**
2. Conectar el repo de GitHub (instalar la app de Vercel en GitHub)
3. **Root Directory: `frontend`** (importante: la app vive en frontend/, ya es autocontenida)
4. Framework se detecta solo: **Next.js**
5. Build Command: `npm run build` (default) · Output: `.next` (default)

## 3. Configurar Environment Variables

Project → **Settings → Environment Variables** (agregar TODAS, una por una):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La URL del pooler de Supabase (puerto 6543) |
| `POLYGON_RPC_URL` | Tu RPC de Alchemy Amoy |
| `NEXT_PUBLIC_POLYGON_RPC_URL` | Igual que POLYGON_RPC_URL (uso cliente) |
| `SERVER_PRIVATE_KEY` | Private key de la wallet (0x5d0A0f…) |
| `SERVER_WALLET_ADDRESS` | `0x5d0A0f056f222D3EDa3866d5977AC99B55C20baF` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x0E362CF2d81538EBa168F92CB382174d01ab25c1` |
| `SENDGRID_API_KEY` | Tu API key de SendGrid |
| `EMAIL_FROM` | Remitente de correos |
| `ADMIN_EMAIL` | Correo del admin |
| `DECANATURA_EMAIL` | Correo de decanatura (alertas de mora) |
| `NEXT_PUBLIC_EMAIL_REGEX` | `@unimayor.edu.co` |
| `VAPID_PUBLIC_KEY` | Clave pública VAPID (Web Push — ver .env local) |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID (Web Push — ver .env local) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Igual que VAPID_PUBLIC_KEY (la lee el navegador) |
| `CRON_SECRET` | Secreto para el cron de recordatorios (ver .env local) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `cristian_santiago@unimayor.edu.co` |
| `SMTP_PASS` | App password de Gmail (en .env local) |

> `NEXT_PUBLIC_*` se exponen al navegador (por eso solo van las que son públicas).
> `SERVER_PRIVATE_KEY`, `DATABASE_URL`, `SMTP_PASS`, `VAPID_PRIVATE_KEY` y `CRON_SECRET` quedan del lado del servidor.

## 4. Deploy

1. Clic en **Deploy**
2. Cuando termine, Vercel te da la URL (`https://<proyecto>.vercel.app`)
3. Probar: login → inventario (¿569 activos?) → crear préstamo → aprobar (¿hash en cadena?) → devolver → QR → exportar Excel

## 5. Configurar el anti-pausa de Supabase

1. En GitHub → repo → **Settings → Secrets and variables → Actions**
2. Agregar 2 secrets:
   - `SUPABASE_URL` = `https://pmfnvwkxstqhkwtjtjbt.supabase.co`
   - `SUPABASE_ANON_KEY` = la publishable key (Supabase → Settings → API)
3. El workflow `.github/workflows/keep-supabase-alive.yml` ya está en el repo
   y se ejecuta solo cada 2 días (ver pestaña **Actions**)

## 6. Recordatorios push (PWA)

1. GitHub → **Settings → Secrets and variables → Actions** — agregar 2 secrets más:
   - `APP_URL` = la URL de producción en Vercel (`https://<proyecto>.vercel.app`)
   - `CRON_SECRET` = el mismo valor de la env var `CRON_SECRET` del .env local
2. El workflow `.github/workflows/recordatorios-push.yml` ya está en el repo:
   todos los días llama a `/api/cron/recordatorios`, que envía **una sola
   notificación por préstamo, el día antes de vencer** (o el mismo día si el
   cron anterior no corrió). Nada de notificaciones diarias: solo avisa cuando
   falta un día (o vence hoy).
3. En el celular: el estudiante ve el banner "¿Querés recordatorios?" → Activar
   → permisos → recibe las notificaciones (y puede instalar la app como PWA:
   Android: menú → "Instalar app" · iPhone: Compartir → "Agregar a inicio";
   en iPhone las notificaciones push requieren la app instalada y iOS 16.4+).

## Notas

- **Vercel gratis (Hobby):** límite de 100 GB/mes de funciones serverless — de sobra para el lab.
- **Base de datos:** Supabase free pausa tras 7 días sin actividad → el workflow lo evita.
  Si alguna vez se pausa: Supabase → Dashboard → botón **Restore** (1 clic, datos intactos).
- **Cambios futuros:** cada `git push` a la rama conectada hace deploy automático.

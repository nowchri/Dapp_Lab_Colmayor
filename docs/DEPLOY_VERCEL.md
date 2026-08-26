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

> `NEXT_PUBLIC_*` se exponen al navegador (por eso solo van las que son públicas).
> `SERVER_PRIVATE_KEY` y `DATABASE_URL` quedan del lado del servidor.

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

## Notas

- **Vercel gratis (Hobby):** límite de 100 GB/mes de funciones serverless — de sobra para el lab.
- **Base de datos:** Supabase free pausa tras 7 días sin actividad → el workflow lo evita.
  Si alguna vez se pausa: Supabase → Dashboard → botón **Restore** (1 clic, datos intactos).
- **Cambios futuros:** cada `git push` a la rama conectada hace deploy automático.

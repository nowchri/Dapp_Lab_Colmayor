# Guía de Despliegue a Producción — DApp Lab IUCMC

> **Versión:** 1.0 — Julio 2026
> **Propósito:** Pasos ordenados para pasar de desarrollo local a producción en Vercel.

---

## Prerrequisitos

Antes de empezar, asegúrate de tener:
- [ ] Node.js 18+ instalado
- [ ] Git instalado
- [ ] Una cuenta de GitHub (para conectar con Vercel)
- [ ] Acceso a la cuenta de Firebase del proyecto
- [ ] Acceso a la cuenta de Alchemy/Infura
- [ ] Acceso a la cuenta de SendGrid/Resend

---

## Fase 1: Configuración Local

```bash
# 1. Clonar el repositorio
git clone <repo-url> dapp-lab-iu
cd dapp-lab-iu

# 2. Instalar dependencias (monorepo)
npm install

# 3. Copiar templates de variables de entorno
cp frontend/.env.local.example frontend/.env.local
cp blockchain/.env.example blockchain/.env

# 4. Editar .env.local y blockchain/.env con credenciales reales
# (Ver CONEXIONES_PENDIENTES.md para cada servicio)
```

---

## Fase 2: Firebase (E1)

1. Ir a https://console.firebase.google.com
2. Crear proyecto → `lab-fisica-iucmc`
3. Habilitar Authentication → Email/Password
4. Habilitar Cloud Firestore
5. En Project Settings > General > Web App > copiar config a `.env.local`
6. En Project Settings > Service Accounts > generar private key > copiar a `.env.local`

**Verificación:**
```bash
cd frontend && npm run dev
# Abrir http://localhost:3000
# Debe cargar sin errores de Firebase en consola
```

---

## Fase 3: Blockchain (E2, E3, E4)

```bash
cd blockchain

# 3a. Generar wallet server-side
npx hardhat run scripts/generate-wallet.ts
# Output: Address + Private Key
# → Pegar en blockchain/.env y frontend/.env.local

# 3b. Fondear wallet con faucet
# Ir a: https://faucet.polygon.technology/
# Red: Amoy
# Address: <la del paso anterior>
# Verificar: https://amoy.polygonscan.com/address/<address>

# 3c. Compilar smart contract
npx hardhat compile
# Debe compilar sin errores

# 3d. Correr tests locales
npx hardhat test
# Deben pasar todos (6 tests)

# 3e. Desplegar a Polygon Amoy
npx hardhat run scripts/deploy.ts --network polygonAmoy
# Output: CONTRACT_ADDRESS
# → Pegar en frontend/.env.local como NEXT_PUBLIC_CONTRACT_ADDRESS
```

---

## Fase 4: Correos (E5)

```bash
# 1. Crear cuenta en https://sendgrid.com
# 2. Settings > API Keys > Create > Full Access
# 3. Copiar API key a frontend/.env.local → SENDGRID_API_KEY
# 4. Configurar emails destino:
#    - ADMIN_EMAIL (Dionizio)
#    - DECANATURA_EMAIL (decanatura)
#    - EMAIL_FROM (remitente)
```

---

## Fase 5: Frontend Build Local

```bash
cd frontend
npm run build
# Debe compilar sin errores

# Si hay errores de tipo:
npm run lint
# Corregir antes de deploy
```

---

## Fase 6: Deploy a Vercel (E6)

```bash
# Opción A: Vercel CLI
cd frontend
npx vercel
# Seguir wizard → conectar proyecto

# Opción B: GitHub + Vercel Dashboard
# 1. Push del repo a GitHub
# 2. Ir a https://vercel.com
# 3. New Project > Import Git Repository
# 4. Framework: Next.js
# 5. Root Directory: frontend/
# 6. Environment Variables: COPIAR TODAS las de .env.local
```

**Variables de entorno en Vercel Dashboard (Settings > Environment Variables):**

| Variable | Entorno | Nota |
|----------|---------|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Production, Preview | Pública |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Production, Preview | Pública |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Production, Preview | Pública |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Production, Preview | Pública |
| `NEXT_PUBLIC_POLYGON_RPC_URL` | Production, Preview | Pública |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Production, Preview | Pública |
| `NEXT_PUBLIC_EMAIL_REGEX` | Production, Preview | Pública |
| `FIREBASE_CLIENT_EMAIL` | All | Secreta |
| `FIREBASE_PRIVATE_KEY` | All | Secreta |
| `FIREBASE_PROJECT_ID` | All | Secreta |
| `POLYGON_RPC_URL` | All | Secreta (si incluye API key) |
| `SERVER_PRIVATE_KEY` | All | **CRÍTICA** — nunca exponer |
| `SERVER_WALLET_ADDRESS` | All | Secreta |
| `SENDGRID_API_KEY` | All | Secreta |
| `EMAIL_FROM` | All | Config |
| `ADMIN_EMAIL` | All | Config |
| `DECANATURA_EMAIL` | All | Config |

> ⚠️ **CRÍTICO**: `SERVER_PRIVATE_KEY` es la llave que firma transacciones blockchain. Si se expone, alguien podría firmar préstamos fraudulentos. Trátala con el mismo cuidado que una contraseña bancaria.

---

## Fase 7: Verificación Post-Deploy

1. ✅ Abrir la URL de Vercel (`.vercel.app`)
2. ✅ Registrarse con correo institucional
3. ✅ El administrador asigna rol "monitor" a un usuario de prueba
4. ✅ Registrar un activo de prueba
5. ✅ Generar QR y verificar que se muestra
6. ✅ Crear bolsa de préstamo (estudiante)
7. ✅ Aprobar préstamo (monitor)
8. ✅ Verificar que aparece en Polygonscan Amoy
9. ✅ Recibir correo de confirmación
10. ✅ Devolver préstamo (monitor)
11. ✅ Verificar que el activo vuelve a "Disponible"

---

## Fase 8: Mantenimiento Continuo

- **Cada mes**: Verificar balance de MATIC en la wallet server-side (el gas en testnet es gratis, pero monitorear).
- **Cada semestre**: El administrador revisa monitores autorizados (RF-03).
- **Antes de cada semestre**: Ejecutar migración de activos desde Excel actualizado (RO-03).
- **Monitorear Firebase quota**: Dashboard > Usage — si se acerca al límite, usar RF-15 (exportar + limpiar).

---

## Rollback / Emergencia

Si algo falla en producción:
1. Vercel Dashboard > Deployments > seleccionar último deploy funcional > "Promote to Production"
2. Si es problema de blockchain: las transacciones ya registradas son inmutables (Regla 3), solo se pierden las pendientes en Firestore.
3. Si es problema de Firebase: los datos están en Firestore; restaurar desde backup (Firebase console > Import/Export).

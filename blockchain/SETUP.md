# SETUP — Blockchain DApp Lab IUCMC

> Paso a paso para dejar todo funcionando desde cero.
> Ruta del proyecto: `D:\U\Proyecto de Grado\Dapp_Lab_Colmayor`

---

## Paso 1: Instalar dependencias del monorepo

Desde la raíz del proyecto:

```bash
cd D:\U\Proyecto de Grado\Dapp_Lab_Colmayor
npm install
```

Esto instala `shared/`, `frontend/` (Next.js, pg, ethers, etc.) y `blockchain/` (Hardhat, ethers).

⚠️ **Si falla en Windows con workspaces**, instala por separado:

```bash
cd shared    && npm install
cd ../blockchain && npm install
cd ../frontend  && npm install
```

Puede tomar **2-5 minutos** la primera vez.

---

## Paso 2: Generar wallet server-side

```bash
cd blockchain
node -e "
  const { Wallet } = require('ethers');
  const w = Wallet.createRandom();
  console.log('PRIVATE_KEY:', w.privateKey);
  console.log('ADDRESS:',    w.address);
"
```

> Si dice `Cannot find module 'ethers'`, vuelve al Paso 1 (npm install no se ejecutó correctamente).

**Output esperado:**
```
PRIVATE_KEY: 0x...64 caracteres hex...
ADDRESS: 0x...40 caracteres hex...
```

---

## Paso 3: Configurar credenciales

Editar `blockchain\.env`:

```
SERVER_PRIVATE_KEY=0x... (la del paso 2)
SERVER_WALLET_ADDRESS=0x... (la del paso 2)
```

Editar `frontend\.env` — reemplazar **SOLO** estas 2 líneas:

```
SERVER_PRIVATE_KEY=0x...  (misma key)
SERVER_WALLET_ADDRESS=0x...  (misma address)
```

---

## Paso 4: Fondear la wallet

1. Ir a: https://faucet.polygon.technology/
2. Seleccionar red: **Amoy**
3. Pegar la address del paso 2
4. Click en "Submit"
5. Esperar ~1 minuto
6. Verificar: https://amoy.polygonscan.com/address/<tu-address>
   - Deben aparecer **0.5 MATIC** o más

---

## Paso 5: Compilar contrato

```bash
cd blockchain
npx hardhat compile
```

Output esperado:
```
Compiled 1 Solidity file successfully
```

---

## Paso 6: Tests locales

```bash
npx hardhat test
```

Deben pasar **8 tests** (todos con ✔).

---

## Paso 7: Desplegar a Polygon Amoy

```bash
npx hardhat run scripts/deploy.ts --network polygonAmoy
```

Output esperado:
```
Deployer: 0x...
Balance:  0.5 MATIC
Desplegando LoanRegistry...
Done! CONTRACT_ADDRESS: 0x...
```

---

## Paso 8: Configurar dirección del contrato

Editar `frontend\.env`:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... (del paso 7, reemplaza: 0xyour-deployed-contract-address)
```

---

## Paso 9: Probar frontend local

```bash
cd frontend
npm run dev
```

Abrir http://localhost:3000

---

## Paso 10: Probar conexión PostgreSQL

Verificar que la BD responde:

```bash
# Desde cmd o PowerShell:
psql -U postgres -d Bd_laboratorio -c "SELECT * FROM perfiles;"
```

Si `psql` no está en PATH, usa PgAdmin para verificar:
- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `1234`
- DB: `Bd_laboratorio`

---

## Problemas comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Cannot find module 'ethers'` | npm install no ejecutado | Paso 1 |
| `Cannot find module 'hardhat'` | npm install en blockchain/ faltante | `cd blockchain && npm install` |
| `insufficient funds` | Wallet sin MATIC | Paso 4 |
| `POLYGON_RPC_URL not configured` | .env mal configurado | Paso 3 |
| `ENOENT: no such file, open '.env'` | No copiaste .env.example → .env | Ya existe .env real, no .env.example |
| `Error: Cannot find module 'ts-node'` | ts-node no en PATH | Usar `npx ts-node` (npx lo busca en node_modules) |
| Frontend carga pero DB no funciona | PostgreSQL no corriendo | Iniciar servicio PostgreSQL en PgAdmin |

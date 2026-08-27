# Anclaje de la cadena a Polygon Amoy (opcional)

> **Cuándo usar esto:** la trazabilidad diaria funciona con la **cadena local en PostgreSQL**
> (tabla `registro_blockchain` — cero gas, infinitas operaciones). Este anclaje es **opcional**
> y sirve para demostrar inmutabilidad real on-chain en momentos puntuales
> (sustentación del proyecto, auditoría, demostración importante).

## Contexto

- La app registra cada préstamo/devolución como un **eslabón encadenado** en `registro_blockchain`
  (hash keccak256 ligado al anterior vía `prev_hash`). Cualquier modificación rompe la cadena.
- El contrato `LaboratoryAssetRegistry` está **desplegado y verificado** en Amoy:
  - Dirección: `0x0E362CF2d81538EBa168F92CB382174d01ab25c1`
  - Red: Polygon Amoy testnet (chainId 80002)
  - Wallet firmante: `0x5d0A0f056f222D3EDa3866d5977AC99B55C20baF` (professor + monitor)
- Las funciones on-chain **siguen existiendo** en `frontend/src/lib/polygon.ts`
  (`registerLoanOnChain`, `registerReturnOnChain`, `registerManyLoansOnChain`,
  `registerManyReturnsOnChain`, `computeLoanHash`, `computeAssetHash`, `computeStudentHash`)
  con tarifas optimizadas (tip mínimo de Amoy + reintento automático).

## Cómo anclar (pasos)

### Opción 1 — Anclar un préstamo puntual (1 tx)

1. En `frontend/.env` confirmá que están:
   - `POLYGON_RPC_URL` (RPC de Amoy)
   - `SERVER_PRIVATE_KEY` (wallet del servidor)
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` (dirección del contrato)
2. Desde una API route (o script), importá de `@/lib/polygon`:
   ```ts
   import { computeLoanHash, computeAssetHash, computeStudentHash, registerManyLoansOnChain } from "@/lib/polygon";

   const loanHash = computeLoanHash(id_prestamo);
   const studentHash = computeStudentHash(id_estudiante);
   const assetHashes = items.map((i: any) => computeAssetHash(i.codigo_qr || i.id_activo));
   const txs = await registerManyLoansOnChain(loanHash, assetHashes, studentHash);
   // txs[0].txHash → guardar en prestamos.blockchain_hash si querés el tx real
   ```
3. Verificá la tx en https://amoy.polygonscan.com/tx/<txHash>

### Opción 2 — Anclar el hash resumen de la cadena (1 tx por evento importante)

1. Tomá el último `hash_registro` de `registro_blockchain` (el eslabón más reciente).
2. Enviá UNA transacción que lo registre. El contrato actual no tiene función de
   "commit genérico", así que usá el flujo normal:
   - Si es la aprobación de un préstamo: `registerLoanBatch(loanHash, [assetHashDelEslabon], studentHash)`
   - O desplegá un contrato mínimo `HashAnchor` (1 función `storeHash(bytes32)`) —
     costo por tx ~50-60k gas (~0.002 MATIC al piso actual de 25 gwei).

### Opción 3 — Volver a registrarlo TODO on-chain (no recomendado para el uso diario)

Si algún día querés que CADA operación vuelva a ir a Amoy:
1. Cambiá las rutas `aprobar/route.ts` y `devolver/route.ts` para usar
   `registerManyLoansOnChain` / `registerManyReturnsOnChain` (importadas de `@/lib/polygon`)
   en vez de `registrarEnCadena` de `@/lib/cadena`.
2. Recordá que el gas de Amoy fluctúa (el piso del tip estuvo en 25 gwei → cada
   préstamo de 4 activos ≈ 0.02-0.04 MATIC). Recargá la wallet antes:
   - https://faucet.polygon.technology/ (una vez cada 24h)

## Verificación de la cadena local

```bash
# Integridad de toda la cadena (devuelve ok: true si ningún eslabón fue alterado)
# Desde una API route:
import { verificarCadena } from "@/lib/cadena";
const { ok, registros } = await verificarCadena();
```

## Costos de referencia (medidos el 25/8/2026, piso de tip 25 gwei)

| Operación | Gas | Costo a 25 gwei |
|---|---|---|
| Deploy del contrato | ~776k | ~0.019 MATIC |
| registerLoanBatch (4 activos, 1 tx) | ~870k | ~0.022 MATIC |
| registerReturnBatch (4 activos, 1 tx) | ~870k | ~0.022 MATIC |
| HashAnchor.storeHash (1 tx) | ~60k | ~0.0015 MATIC |

Si el piso del gas baja a 1-3 gwei (lo histórico de Amoy), todos los costos se dividen por 10-25x.

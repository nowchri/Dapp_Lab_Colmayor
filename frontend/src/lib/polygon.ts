/**
 * polygon.ts — Polygon Amoy RPC + Server-side Wallet
 *
 * ⚠️  SOLO PARA API ROUTES (server-side). NUNCA en cliente.
 *
 * PUNTO DE CONEXION: Polygon Amoy Testnet (E2 RESUELTO)
 *   RPC endpoint: https://polygon-amoy.g.alchemy.com/v2/alch_Iz_Z3n06ZnpaR0nj-vDFW
 *   Ya configurado y funcionando.
 *
 * E3: Wallet server-side — generar con script generate-wallet.ts
 *   y pegar SERVER_PRIVATE_KEY en .env
 *
 * D3 RESUELTO: MVP con 1 wallet principal (docente).
 *   La wallet del monitor se rota cada semestre pero es gestionada
 *   por el docente desde el panel de administración.
 *   Por ahora: 1 wallet maestra + 1 wallet monitor (2 mínimo).
 *
 * ARQUITECTURA GASLESS (RNF-05):
 *   El servidor firma y paga el gas. Usuario NUNCA toca blockchain.
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import { POLYGON_RPC_URL } from "@shared/constants";

// --- Configuración ---

let provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL, 80002, {
      staticNetwork: true,
    });
  }
  return provider;
}

export function getWallet(privateKey?: string): Wallet {
  const pk = privateKey || process.env.SERVER_PRIVATE_KEY;
  if (!pk || pk.startsWith("0xyour-")) {
    throw new Error(
      "SERVER_PRIVATE_KEY no configurada. " +
      "Genera wallet con: npx hardhat run scripts/generate-wallet.ts " +
      "y pega la private key en .env como SERVER_PRIVATE_KEY"
    );
  }
  return new Wallet(pk, getProvider());
}

// --- Smart Contract ---

let contract: Contract | null = null;

const LOAN_REGISTRY_ABI = [
  "function registerLoan(bytes32 loanHash, address estudiante) external",
  "function registerReturn(bytes32 loanHash) external",
  "function verifyLoan(bytes32 loanHash) external view returns (bool exists, bool returned, uint256 timestamp, uint256 returnTimestamp)",
  "function getLoanRecord(bytes32 loanHash) external view returns (tuple(bytes32 loanHash, address estudiante, address monitor, uint256 timestamp, bool returned, uint256 returnTimestamp))",
  "event LoanRegistered(bytes32 indexed loanHash, address indexed estudiante, address indexed monitor, uint256 timestamp)",
  "event LoanReturned(bytes32 indexed loanHash, uint256 returnTimestamp)",
];

export function getContract(): Contract {
  if (!contract) {
    const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!addr || addr.startsWith("0xyour-")) {
      throw new Error(
        "NEXT_PUBLIC_CONTRACT_ADDRESS no configurada. " +
        "Despliega el contrato con: npm run deploy:contract"
      );
    }
    contract = new Contract(addr, LOAN_REGISTRY_ABI, getWallet());
  }
  return contract;
}

// --- Firma y envío de transacciones ---

export async function registerLoanOnChain(
  loanHash: string,
  estudianteId: string
): Promise<{ txHash: string; blockNumber: number }> {
  const c = getContract();

  // Derivar dirección proxy del estudiante (nunca expone identidad real — RNF-06)
  const estudianteProxy = ethers.zeroPadValue(
    ethers.keccak256(ethers.toUtf8Bytes(estudianteId)).slice(0, 42),
    20
  );

  console.log(`[Polygon] Registrando préstamo: hash=${loanHash}`);
  const tx = await c.registerLoan(loanHash, estudianteProxy);
  const receipt = await tx.wait();

  console.log(`[Polygon] Confirmado: tx=${tx.hash}, block=${receipt.blockNumber}`);
  return { txHash: tx.hash, blockNumber: receipt.blockNumber };
}

export async function registerReturnOnChain(
  loanHash: string
): Promise<{ txHash: string; blockNumber: number }> {
  const c = getContract();
  console.log(`[Polygon] Registrando devolución: hash=${loanHash}`);
  const tx = await c.registerReturn(loanHash);
  const receipt = await tx.wait();

  console.log(`[Polygon] Confirmado: tx=${tx.hash}, block=${receipt.blockNumber}`);
  return { txHash: tx.hash, blockNumber: receipt.blockNumber };
}

export async function verifyLoanOnChain(loanHash: string) {
  const c = getContract();
  const result = await c.verifyLoan(loanHash);
  return {
    exists: result.exists,
    returned: result.returned,
    timestamp: Number(result.timestamp),
    returnTimestamp: Number(result.returnTimestamp),
  };
}

// --- Cálculo del hash (RF-10) ---

export function computeLoanHash(
  loanId: string,
  estudianteId: string,
  monitorId: string,
  assetIds: string[],
  timestamp: number
): string {
  const sorted = [...assetIds].sort();
  const payload = `${loanId}:${estudianteId}:${monitorId}:${sorted.join(",")}:${timestamp}`;
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

/**
 * polygon.ts — Polygon Amoy RPC + Server-side Wallet + LaboratorioOnChain
 *
 * ⚠️  SOLO PARA API ROUTES (server-side). NUNCA en cliente.
 *
 * Contrato desplegado: LaboratoryAssetRegistry
 *   - registerLoan(bytes32 loanHash, bytes32 assetHash, bytes32 studentHash) onlyMonitor
 *   - registerReturn(bytes32 loanHash, bytes32 assetHash, bytes32 studentHash) onlyMonitor
 *   - getMovement(uint256) / getAssetHistory(bytes32)
 *   - eventos LoanRegistered / ReturnRegistered
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

// --- Smart Contract (ABI real del LaboratoryAssetRegistry) ---

let contract: Contract | null = null;

const LOAN_REGISTRY_ABI = [
  "function professor() view returns (address)",
  "function monitors(address) view returns (bool)",
  "function registerLoan(bytes32 loanHash, bytes32 assetHash, bytes32 studentHash) external",
  "function registerReturn(bytes32 loanHash, bytes32 assetHash, bytes32 studentHash) external",
  "function registerLoanBatch(bytes32 loanHash, bytes32[] assetHashes, bytes32 studentHash) external",
  "function registerReturnBatch(bytes32 loanHash, bytes32[] assetHashes, bytes32 studentHash) external",
  "function getAssetHistory(bytes32 assetHash) view returns (uint256[])",
  "function getMovement(uint256 index) view returns (tuple(bytes32 loanHash, bytes32 assetHash, bytes32 studentHash, address monitor, uint64 timestamp, uint8 movementType))",
  "function totalLoans() view returns (uint256)",
  "function totalReturns() view returns (uint256)",
  "event LoanRegistered(bytes32 indexed assetHash, bytes32 indexed loanHash, bytes32 indexed studentHash)",
  "event ReturnRegistered(bytes32 indexed assetHash, bytes32 indexed loanHash)",
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

// --- Hashing (RF-10: hashes keccak256, nunca datos personales en cadena) ---

/** Hash de la bolsa de préstamo (id_prestamo de Postgres). */
export function computeLoanHash(loanId: string | number): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`loan:${loanId}`));
}

/** Hash único del activo físico (su QR). */
export function computeAssetHash(qrOrId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`asset:${qrOrId}`));
}

/** Hash del estudiante (id_perfil). */
export function computeStudentHash(studentId: string | number): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`student:${studentId}`));
}


// --- Tarifas de gas (optimización) ---
// Amoy exige un tip mínimo (hoy 25 gwei). El default de ethers usa la
// sugerencia del RPC (33-36 gwei) → fijamos el piso y reintentamos si sube.
const MIN_TIP = ethers.parseUnits("25", "gwei");

async function getFeeOverrides() {
  const block = await getProvider().getBlock("latest");
  const base = block?.baseFeePerGas || 0n;
  return {
    maxPriorityFeePerGas: MIN_TIP,
    maxFeePerGas: base * 2n + MIN_TIP + ethers.parseUnits("1", "gwei"),
  };
}

async function sendWithRetry(call: (overrides: any) => Promise<any>): Promise<any> {
  const overrides = await getFeeOverrides();
  try {
    return await call(overrides);
  } catch (err: any) {
    if (err?.message?.includes("below minimum")) {
      console.log("[Polygon] El piso de gas subió, reintentando con sugerencia del RPC");
      const suggested = await getProvider().send("eth_maxPriorityFeePerGas", []);
      return await call({
        maxPriorityFeePerGas: suggested,
        maxFeePerGas: suggested * 2n + ethers.parseUnits("1", "gwei"),
      });
    }
    throw err;
  }
}

// --- Registro on-chain ---

export interface TxResult {
  txHash: string;
  blockNumber: number;
}

/** Registra UN préstamo de UN activo. */
export async function registerLoanOnChain(
  loanHash: string,
  assetHash: string,
  studentHash: string
): Promise<TxResult> {
  const c = getContract();
  console.log(`[Polygon] registerLoan: loan=${loanHash.slice(0, 10)}… asset=${assetHash.slice(0, 10)}…`);
  const tx = await sendWithRetry((ov) => c.registerLoan(loanHash, assetHash, studentHash, ov));
  const receipt = await tx.wait();
  console.log(`[Polygon] Confirmado: tx=${tx.hash}, block=${receipt.blockNumber}`);
  return { txHash: tx.hash, blockNumber: receipt.blockNumber };
}

/**
 * Registra TODA la bolsa en UNA transacción (registerLoanBatch).
 * Cada activo recibe su propio Movement y evento dentro del contrato.
 */
export async function registerManyLoansOnChain(
  loanHash: string,
  assetHashes: string[],
  studentHash: string
): Promise<TxResult[]> {
  if (assetHashes.length === 0) return [];
  const c = getContract();
  console.log(`[Polygon] registerLoanBatch: ${assetHashes.length} activos, loan=${loanHash.slice(0, 10)}…`);
  const tx = await sendWithRetry((ov) => c.registerLoanBatch(loanHash, assetHashes, studentHash, ov));
  const receipt = await tx.wait();
  console.log(`[Polygon] Confirmado: tx=${tx.hash}, block=${receipt.blockNumber}`);
  return [{ txHash: tx.hash, blockNumber: receipt.blockNumber }];
}

/** Registra la devolución de UN activo. */
export async function registerReturnOnChain(
  loanHash: string,
  assetHash: string,
  studentHash: string
): Promise<TxResult> {
  const c = getContract();
  console.log(`[Polygon] registerReturn: loan=${loanHash.slice(0, 10)}… asset=${assetHash.slice(0, 10)}…`);
  const tx = await sendWithRetry((ov) => c.registerReturn(loanHash, assetHash, studentHash, ov));
  const receipt = await tx.wait();
  console.log(`[Polygon] Confirmado: tx=${tx.hash}, block=${receipt.blockNumber}`);
  return { txHash: tx.hash, blockNumber: receipt.blockNumber };
}

/** Registra las devoluciones de TODA la bolsa en UNA transacción. */
export async function registerManyReturnsOnChain(
  loanHash: string,
  assetHashes: string[],
  studentHash: string
): Promise<TxResult[]> {
  if (assetHashes.length === 0) return [];
  const c = getContract();
  console.log(`[Polygon] registerReturnBatch: ${assetHashes.length} activos, loan=${loanHash.slice(0, 10)}…`);
  const tx = await sendWithRetry((ov) => c.registerReturnBatch(loanHash, assetHashes, studentHash, ov));
  const receipt = await tx.wait();
  console.log(`[Polygon] Confirmado: tx=${tx.hash}, block=${receipt.blockNumber}`);
  return [{ txHash: tx.hash, blockNumber: receipt.blockNumber }];
}

// --- Verificación / consulta ---

export interface OnChainMovement {
  loanHash: string;
  assetHash: string;
  studentHash: string;
  monitor: string;
  timestamp: number;
  movementType: number; // 0 = Loan, 1 = Return
}

export async function getMovementOnChain(index: number): Promise<OnChainMovement> {
  const c = getContract();
  const m = await c.getMovement(index);
  return {
    loanHash: m.loanHash,
    assetHash: m.assetHash,
    studentHash: m.studentHash,
    monitor: m.monitor,
    timestamp: Number(m.timestamp),
    movementType: Number(m.movementType),
  };
}

export async function getAssetHistoryOnChain(assetHash: string): Promise<number[]> {
  const c = getContract();
  const idx = await c.getAssetHistory(assetHash);
  return idx.map((i: any) => Number(i));
}

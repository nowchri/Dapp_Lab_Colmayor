import { ethers } from "ethers";

const RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/demo";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x8f8ed9B2b92d068318eCA95BB31201d1C2B962c6";
const SERVER_WALLET = process.env.SERVER_WALLET_ADDRESS || "";

// Minimal ABI for contract events and read functions
const ABI = [
  "function professor() view returns (address)",
  "function monitors(address) view returns (bool)",
  "function getMovement(uint256 index) view returns (tuple(bytes32 loanHash, bytes32 assetHash, bytes32 studentHash, address monitor, uint64 timestamp, uint8 movementType))",
  "event LoanRegistered(bytes32 indexed assetHash, bytes32 indexed loanHash, bytes32 indexed studentHash)",
  "event ReturnRegistered(bytes32 indexed assetHash, bytes32 indexed loanHash)",
];

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) provider = new ethers.JsonRpcProvider(RPC_URL, 80002, { staticNetwork: true });
  return provider;
}

export function getContract(): ethers.Contract {
  if (!contract) contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, getProvider());
  return contract;
}

export async function getBalance(address: string): Promise<string> {
  try {
    const balance = await getProvider().getBalance(address);
    return ethers.formatEther(balance);
  } catch { return "—"; }
}

export async function getContractInfo() {
  try {
    const c = getContract();
    const professor = await c.professor();
    return { professor };
  } catch { return { professor: "—" }; }
}

export interface BlockchainEvent {
  event: string;
  assetHash: string;
  loanHash: string;
  studentHash: string;
  timestamp: string;
}

export async function getRecentEvents(limit = 5): Promise<BlockchainEvent[]> {
  try {
    const c = getContract();
    const filterLoan = c.filters.LoanRegistered();
    const filterReturn = c.filters.ReturnRegistered();

    const [loanEvents, returnEvents] = await Promise.all([
      c.queryFilter(filterLoan, -5000),
      c.queryFilter(filterReturn, -5000),
    ]);

    const all: BlockchainEvent[] = [];

    const withTs = async (e: any) => {
      try { const b = await e.getBlock(); return Number(b.timestamp) * 1000; } catch { return Date.now(); }
    };

    for (const e of loanEvents) {
      all.push({
        event: "Prestamo",
        assetHash: (e as any).args?.assetHash || "",
        loanHash: (e as any).args?.loanHash || "",
        studentHash: (e as any).args?.studentHash || "",
        timestamp: new Date(await withTs(e)).toLocaleString("es-CO"),
      });
    }

    for (const e of returnEvents) {
      all.push({
        event: "Devolucion",
        assetHash: (e as any).args?.assetHash || "",
        loanHash: (e as any).args?.loanHash || "",
        studentHash: "",
        timestamp: new Date(await withTs(e)).toLocaleString("es-CO"),
      });
    }

    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  } catch {
    return [];
  }
}

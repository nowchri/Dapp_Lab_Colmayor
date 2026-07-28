import { ethers } from "ethers";

const RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/demo";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x8f8ed9B2b92d068318eCA95BB31201d1C2B962c6";
const SERVER_WALLET = process.env.NEXT_PUBLIC_SERVER_WALLET_ADDRESS || "";

// Minimal ABI for contract events and read functions
const ABI = [
  "function professor() view returns (address)",
  "function monitors(address) view returns (bool)",
  "function getMovement(uint256 index) view returns (tuple(address actor, bytes32 loanHash, bytes32 assetHash, bytes32 studentHash, uint256 timestamp, bool isReturn))",
  "event AssetRegistered(address indexed actor, bytes32 indexed loanHash, bytes32 assetHash, bytes32 studentHash, uint256 timestamp)",
  "event AssetReturned(address indexed actor, bytes32 indexed loanHash, bytes32 assetHash, bytes32 studentHash, uint256 timestamp)",
];

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) provider = new ethers.JsonRpcProvider(RPC_URL);
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
  actor: string;
  loanHash: string;
  assetHash: string;
  studentHash: string;
  timestamp: string;
}

export async function getRecentEvents(limit = 5): Promise<BlockchainEvent[]> {
  try {
    const c = getContract();
    const filterRegistered = c.filters.AssetRegistered();
    const filterReturned = c.filters.AssetReturned();

    const [regEvents, retEvents] = await Promise.all([
      c.queryFilter(filterRegistered, -5000),
      c.queryFilter(filterReturned, -5000),
    ]);

    const all: BlockchainEvent[] = [];

    for (const e of regEvents) {
      all.push({
        event: "Prestamo",
        actor: (e as any).args?.actor || "",
        loanHash: (e as any).args?.loanHash || "",
        assetHash: (e as any).args?.assetHash || "",
        studentHash: (e as any).args?.studentHash || "",
        timestamp: new Date(Number((e as any).args?.timestamp || 0) * 1000).toLocaleString("es-CO"),
      });
    }

    for (const e of retEvents) {
      all.push({
        event: "Devolucion",
        actor: (e as any).args?.actor || "",
        loanHash: (e as any).args?.loanHash || "",
        assetHash: (e as any).args?.assetHash || "",
        studentHash: (e as any).args?.studentHash || "",
        timestamp: new Date(Number((e as any).args?.timestamp || 0) * 1000).toLocaleString("es-CO"),
      });
    }

    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  } catch {
    return [];
  }
}
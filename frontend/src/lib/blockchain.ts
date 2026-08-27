import { ethers } from "ethers";

const RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/demo";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x8f8ed9B2b92d068318eCA95BB31201d1C2B962c6";
const SERVER_WALLET = process.env.SERVER_WALLET_ADDRESS || "";

// Minimal ABI for contract read functions
const ABI = [
  "function professor() view returns (address)",
  "function monitors(address) view returns (bool)",
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

// Los eventos ahora se leen desde la cadena local (registro_blockchain)
// via GET /api/blockchain/eventos — ver lib/cadena.ts

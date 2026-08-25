// Test on-chain: registerLoan + registerReturn reales en Amoy
// Uso: node scripts/test-onchain.mjs  (desde frontend/, usa su ethers)
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { ethers } from "ethers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FE = join(__dirname, "..", "frontend", ".env");
const env = readFileSync(FE, "utf8");
const get = k => { const m = env.match(new RegExp("^" + k + "=(.+)", "m")); return m ? m[1].trim() : undefined; };

const rpc = get("POLYGON_RPC_URL");
const addr = get("NEXT_PUBLIC_CONTRACT_ADDRESS");
const pk = get("SERVER_PRIVATE_KEY");

const ABI = [
  "function professor() view returns (address)",
  "function monitors(address) view returns (bool)",
  "function registerLoan(bytes32 loanHash, bytes32 assetHash, bytes32 studentHash) external",
  "function registerReturn(bytes32 loanHash, bytes32 assetHash, bytes32 studentHash) external",
  "function getAssetHistory(bytes32 assetHash) view returns (uint256[])",
  "function getMovement(uint256 index) view returns (tuple(bytes32 loanHash, bytes32 assetHash, bytes32 studentHash, address monitor, uint64 timestamp, uint8 movementType))",
  "function totalLoans() view returns (uint256)",
  "function totalReturns() view returns (uint256)",
];

const sha = s => ethers.keccak256(ethers.toUtf8Bytes(s));
const H = {
  loan: id => sha("loan:" + id),
  asset: qr => sha("asset:" + qr),
  student: id => sha("student:" + id),
};

const client = new pg.Client({ connectionString: get("DATABASE_URL") });
await client.connect();

// Activo real con QR
const a = await client.query("SELECT codigo_qr FROM activos WHERE codigo_qr IS NOT NULL ORDER BY nombre_activo LIMIT 1");
const qr = a.rows[0].codigo_qr;
console.log("Activo de prueba:", qr);

const provider = new ethers.JsonRpcProvider(rpc, 80002, { staticNetwork: true });
const wallet = new ethers.Wallet(pk, provider);
const c = new ethers.Contract(addr, ABI, wallet);

const loanHash = H.loan("TEST-999");
const assetHash = H.asset(qr);
const studentHash = H.student("TEST-STUDENT");

const before = await c.totalLoans();
console.log("totalLoans antes:", before.toString());

console.log("→ registerLoan...");
const tx1 = await c.registerLoan(loanHash, assetHash, studentHash);
const r1 = await tx1.wait();
console.log("  tx1:", tx1.hash, "block", r1.blockNumber);

const after = await c.totalLoans();
console.log("totalLoans después:", after.toString(), "(+", Number(after) - Number(before), ")");

const hist = await c.getAssetHistory(assetHash);
console.log("Historial del activo (índices):", hist.map((i) => i.toString()));

const m0 = await c.getMovement(0);
console.log("Movimiento 0:", { loan: m0.loanHash.slice(0, 10), asset: m0.assetHash.slice(0, 10), type: Number(m0.movementType) });

console.log("→ registerReturn...");
const tx2 = await c.registerReturn(loanHash, assetHash, studentHash);
const r2 = await tx2.wait();
console.log("  tx2:", tx2.hash, "block", r2.blockNumber);

const hist2 = await c.getAssetHistory(assetHash);
console.log("Historial después del return:", hist2.map((i) => i.toString()));
const tr = await c.totalReturns();
console.log("totalReturns:", tr.toString());

await client.end();
console.log("\n✅ PRUEBA COMPLETA — contrato conectado y funcionando");

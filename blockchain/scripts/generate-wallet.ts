import { Wallet } from "ethers";

async function main() {
  const w = Wallet.createRandom();
  console.log("=".repeat(60));
  console.log("  WALLET SERVER-SIDE");
  console.log("=".repeat(60));
  console.log();
  console.log("PRIVATE_KEY: " + w.privateKey);
  console.log("ADDRESS:     " + w.address);
  console.log();
  console.log("PEGAR EN blockchain/.env y frontend/.env:");
  console.log("  SERVER_PRIVATE_KEY=" + w.privateKey);
  console.log("  SERVER_WALLET_ADDRESS=" + w.address);
  console.log();
  console.log("FONDEAR: https://faucet.polygon.technology/ (Amoy)");
  console.log("=".repeat(60));
}

main().catch((e) => { console.error(e); process.exit(1); });

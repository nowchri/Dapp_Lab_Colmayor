import { ethers } from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("  DEPLOY LoanRegistry -> Polygon Amoy");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Wallet: ${deployer.address}`);
  console.log(`MATIC:  ${ethers.formatEther(bal)}`);

  if (bal === 0n) {
    console.error("ERROR: Sin MATIC.");
    console.error("Fondea: https://faucet.polygon.technology/ (Amoy)");
    process.exit(1);
  }

  const F = await ethers.getContractFactory("LaboratoryAssetRegistry");
  const c = await F.deploy(deployer.address);
  await c.waitForDeployment();

  const addr = await c.getAddress();
  console.log(`\nCONTRACT_ADDRESS=${addr}`);
  console.log(`TX=${c.deploymentTransaction()?.hash}`);
  console.log();
  console.log(`Pegar en frontend/.env: NEXT_PUBLIC_CONTRACT_ADDRESS=${addr}`);
  console.log("=".repeat(60));
}

main().catch((e) => { console.error(e); process.exit(1); });

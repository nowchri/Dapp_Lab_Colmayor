import { ethers } from "hardhat";

async function main() {
  console.log("DEMO sign-and-send — requiere CONTRACT_ADDRESS en .env");
  const [server] = await ethers.getSigners();
  console.log(`Server Wallet: ${server.address}`);

  const loanHash = ethers.keccak256(
    ethers.toUtf8Bytes("demo-loan:student-1:monitor-1:asset-1,asset-2:1700000000")
  );
  const proxy = ethers.zeroPadValue(
    ethers.keccak256(ethers.toUtf8Bytes("student-1")).slice(0, 42),
    20
  );

  console.log(`Loan Hash: ${loanHash}`);
  console.log(`Proxy:     ${proxy}`);
  console.log("(Contrato deployado? Pega address en hardhat.config networks.polygonAmoy.deploy)");
}

main().catch((e) => { console.error(e); process.exit(1); });

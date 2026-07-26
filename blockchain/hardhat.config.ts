import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, ".env") });

const POLYGON_RPC = process.env.POLYGON_RPC_URL
  || "https://polygon-amoy.g.alchemy.com/v2/alch_Iz_Z3n06ZnPaR0nj-vDFW";
const PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    polygonAmoy: {
      url: POLYGON_RPC,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80002,
    },
  },
};

export default config;

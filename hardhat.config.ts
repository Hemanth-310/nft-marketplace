import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import * as dotenv from "dotenv";

dotenv.config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
  {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
],
  },
  networks: {
    hardhat: { chainId: 1337 },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? PRIVATE_KEY.split(",") : [],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;
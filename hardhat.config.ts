import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    // Uncomment when ready to deploy to testnet
    // goerli: {
    //   url: process.env.ETHEREUM_RPC_URL || "",
    //   accounts: process.env.ETHEREUM_PRIVATE_KEY ? [process.env.ETHEREUM_PRIVATE_KEY] : []
    // }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
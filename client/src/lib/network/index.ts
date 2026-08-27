import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { defineChain } from "viem";
import { createConfig, http } from "wagmi";

// 1. Define Primary Target Chain: Somnia Shannon Testnet
export const somniaShannonChain = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
    public: { http: ["https://dream-rpc.somnia.network"] },
  },
  blockExplorers: {
    default: {
      name: "Shannon Explorer",
      url: "https://shannon-explorer.somnia.network",
    },
  },
  testnet: true,
});

// Secondary / Testnet Chain: Sepolia
export const sepoliaChain = defineChain({
  id: 11155111,
  name: "Sepolia Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.sepolia.org"] },
    public: { http: ["https://rpc.sepolia.org"] },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://sepolia.etherscan.io",
    },
  },
  testnet: true,
});

// 2. Configure RainbowKit connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: "Supported Wallets",
      wallets: [injectedWallet, metaMaskWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  {
    appName: "ProofCast",
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
  }
);

// 3. Create Wagmi config
export const wagmiConfig = createConfig({
  connectors,
  chains: [somniaShannonChain, sepoliaChain],
  transports: {
    [somniaShannonChain.id]: http(somniaShannonChain.rpcUrls.default.http[0]),
    [sepoliaChain.id]: http(sepoliaChain.rpcUrls.default.http[0]),
  },
});

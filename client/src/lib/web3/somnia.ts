/**
 * ProofCast Client-Side Somnia Web3 & DreamDEX Integration
 * 
 * Invariants:
 * - Server NEVER receives or custodies private keys.
 * - Transactions are constructed client-side and signed in the user's browser wallet.
 */

export const SOMNIA_SHANNON_TESTNET = {
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
    public: { http: ["https://dream-rpc.somnia.network"] },
  },
  blockExplorers: {
    default: { name: "Shannon Explorer", url: "https://shannon-explorer.somnia.network" },
  },
};

export const PROOFCAST_ANCHOR_ABI = [
  {
    type: "function",
    name: "anchorReceipt",
    inputs: [
      { name: "receiptHash", type: "bytes32" },
      { name: "marketId", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyAnchor",
    inputs: [{ name: "receiptHash", type: "bytes32" }],
    outputs: [
      { name: "isAnchored", type: "bool" },
      { name: "marketId", type: "string" },
      { name: "timestamp", type: "uint256" },
      { name: "owner", type: "address" },
    ],
    stateMutability: "view",
  },
] as const;

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
}

export async function getBrowserWalletAddress(): Promise<string | null> {
  if (typeof window === "undefined" || !("ethereum" in window)) return null;
  try {
    const accounts = (await (window as any).ethereum.request({ method: "eth_accounts" })) as string[];
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

export async function connectBrowserWallet(): Promise<string | null> {
  if (typeof window === "undefined" || !("ethereum" in window)) {
    throw new Error("No Web3 browser wallet detected (e.g. MetaMask / Rabby)");
  }
  const accounts = (await (window as any).ethereum.request({ method: "eth_requestAccounts" })) as string[];
  return accounts[0] ?? null;
}

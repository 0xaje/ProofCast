import { encodeFunctionData, isAddress } from "viem";

export const SOMNIA_SHANNON_TESTNET = {
  id: 50312,
  idHex: "0xc488",
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

export const PROOFCAST_ANCHOR_CONTRACT =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SOMNIA_ANCHOR_CONTRACT) ||
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

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

export async function connectBrowserWallet(): Promise<string> {
  if (typeof window === "undefined" || !("ethereum" in window)) {
    throw new Error("No Web3 browser wallet detected (e.g. MetaMask / Rabby). Please install a Web3 wallet extension.");
  }
  const accounts = (await (window as any).ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts || accounts.length === 0 || !accounts[0]) {
    throw new Error("No Ethereum account connected.");
  }
  return accounts[0];
}

export async function switchOrAddSomniaShannon(): Promise<void> {
  if (typeof window === "undefined" || !("ethereum" in window)) {
    throw new Error("No Web3 wallet detected.");
  }
  const ethereum = (window as any).ethereum;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SOMNIA_SHANNON_TESTNET.idHex }],
    });
  } catch (switchError: any) {
    // 4902 error code means the chain has not been added yet
    if (switchError?.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SOMNIA_SHANNON_TESTNET.idHex,
            chainName: SOMNIA_SHANNON_TESTNET.name,
            nativeCurrency: SOMNIA_SHANNON_TESTNET.nativeCurrency,
            rpcUrls: SOMNIA_SHANNON_TESTNET.rpcUrls.default.http,
            blockExplorerUrls: [SOMNIA_SHANNON_TESTNET.blockExplorers.default.url],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

export async function anchorReceiptToSomniaChain(
  receiptHash: string,
  marketId: string,
): Promise<{ txHash: string; callerAddress: string }> {
  const address = await connectBrowserWallet();
  await switchOrAddSomniaShannon();

  // Format receipt hash to 32 bytes hex
  let formattedHash = receiptHash.trim();
  if (!formattedHash.startsWith("0x")) {
    formattedHash = `0x${formattedHash}`;
  }
  if (formattedHash.length !== 66) {
    throw new Error(`Invalid 32-byte receipt hash format (expected 66 characters with 0x prefix, got ${formattedHash.length})`);
  }

  // Encode anchorReceipt(bytes32,string) function call data
  const calldata = encodeFunctionData({
    abi: PROOFCAST_ANCHOR_ABI,
    functionName: "anchorReceipt",
    args: [formattedHash as `0x${string}`, marketId || "SOMNIA_EVENT_MARKET"],
  });

  const ethereum = (window as any).ethereum;
  const txHash = (await ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: address,
        to: PROOFCAST_ANCHOR_CONTRACT,
        data: calldata,
      },
    ],
  })) as string;

  return { txHash, callerAddress: address };
}


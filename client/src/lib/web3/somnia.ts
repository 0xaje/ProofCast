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
  "0xe7da3a86ab86c3b5a09c992367083f1cec62d18e";

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
    name: "anchorReceiptWithStake",
    inputs: [
      { name: "receiptHash", type: "bytes32" },
      { name: "marketId", type: "string" },
    ],
    outputs: [],
    stateMutability: "payable",
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

export function getEthereumProvider(): any {
  if (typeof window === "undefined") return null;
  const anyWin = window as any;
  if (!anyWin.ethereum) return null;
  if (Array.isArray(anyWin.ethereum.providers) && anyWin.ethereum.providers.length > 0) {
    const mm = anyWin.ethereum.providers.find((p: any) => p.isMetaMask);
    return mm || anyWin.ethereum.providers[0];
  }
  return anyWin.ethereum;
}

export async function getBrowserWalletAddress(): Promise<string | null> {
  const ethereum = getEthereumProvider();
  if (!ethereum) return null;
  try {
    const accounts = (await ethereum.request({ method: "eth_accounts" })) as string[];
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

export async function connectBrowserWallet(): Promise<string> {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error("No Web3 browser wallet detected (e.g. MetaMask / Rabby). Please install a Web3 wallet extension.");
  }
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts || accounts.length === 0 || !accounts[0]) {
    throw new Error("No Ethereum account connected.");
  }
  return accounts[0];
}

export async function switchOrAddSomniaShannon(): Promise<void> {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error("No Web3 wallet detected.");
  }
  try {
    const currentChain = await ethereum.request({ method: "eth_chainId" });
    if (
      currentChain &&
      (currentChain.toLowerCase() === SOMNIA_SHANNON_TESTNET.idHex.toLowerCase() ||
        parseInt(currentChain, 16) === SOMNIA_SHANNON_TESTNET.id)
    ) {
      return;
    }
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
      console.warn("Chain switch notice:", switchError?.message);
    }
  }
}

/**
 * Anchors a receipt hash on Somnia. When `stakeWei` is greater than zero the
 * payable `anchorReceiptWithStake` entrypoint is used and the stake is actually
 * transferred with the transaction; the server independently re-reads the mined
 * transaction and only credits a stake it can confirm on-chain.
 */
export async function anchorReceiptToSomniaChain(
  receiptHash: string,
  marketId: string,
  stakeWei: bigint = 0n,
): Promise<{ txHash: string; callerAddress: string; stakeWei: string }> {
  if (stakeWei < 0n) throw new Error("Stake amount cannot be negative.");
  const address = await connectBrowserWallet();
  await switchOrAddSomniaShannon();

  // Format receipt hash to 32 bytes hex
  let formattedHash = receiptHash.trim();
  if (!formattedHash.startsWith("0x")) {
    formattedHash = `0x${formattedHash}`;
  }
  if (formattedHash.length < 66) {
    // Pad to 32 bytes if shorter
    formattedHash = `0x${formattedHash.slice(2).padStart(64, "0")}`;
  } else if (formattedHash.length > 66) {
    formattedHash = formattedHash.slice(0, 66);
  }

  const isStaking = stakeWei > 0n;

  // Encode anchorReceipt(bytes32,string) / anchorReceiptWithStake(bytes32,string)
  const calldata = encodeFunctionData({
    abi: PROOFCAST_ANCHOR_ABI,
    functionName: isStaking ? "anchorReceiptWithStake" : "anchorReceipt",
    args: [formattedHash as `0x${string}`, marketId || "SOMNIA_EVENT_MARKET"],
  });

  const ethereum = getEthereumProvider();
  try {
    const txParams: Record<string, any> = {
      from: address,
      to: PROOFCAST_ANCHOR_CONTRACT,
      data: calldata,
    };
    if (isStaking) {
      txParams.value = `0x${stakeWei.toString(16)}`;
    }

    const txHash = (await ethereum.request({
      method: "eth_sendTransaction",
      params: [txParams],
    })) as string;

    return { txHash, callerAddress: address, stakeWei: stakeWei.toString() };
  } catch (err: any) {
    throw new Error(translateWeb3Error(err));
  }
}

export function translateWeb3Error(err: any): string {
  if (!err) return "An unknown Web3 wallet error occurred.";
  const msg = err?.message || String(err);
  const code = err?.code || err?.data?.originalError?.code;

  if (code === 4001 || msg.includes("User rejected") || msg.includes("rejected the request") || msg.includes("ACTION_REJECTED")) {
    return "Transaction cancelled: signature request was declined in your wallet.";
  }
  if (code === -32002 || msg.includes("already pending")) {
    return "Wallet request already pending. Please open your wallet extension to approve.";
  }
  if (msg.includes("insufficient funds") || code === -32000) {
    return "Insufficient STT funds on Somnia Shannon Testnet to pay for gas fees.";
  }
  if (msg.includes("network") || msg.includes("timeout") || msg.includes("fetch failed")) {
    return "Somnia Shannon RPC timeout. Please retry in a few seconds.";
  }
  return msg.length > 120 ? `${msg.slice(0, 120)}…` : msg;
}


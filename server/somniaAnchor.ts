import { createPublicClient, decodeFunctionData, defineChain, http, type Hash } from "viem";

const ANCHOR_ABI = [
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
] as const;

/**
 * Server-side verification of Somnia anchor transactions.
 *
 * The client reports the transaction hash it broadcast, but a reported hash is
 * only a claim. Nothing is credited to a Decision Receipt until this module has
 * independently re-read the mined transaction from a Somnia RPC and confirmed
 * that it succeeded, that it targeted the ProofCast anchor contract, and that it
 * came from the address claiming it. The staked amount recorded against a receipt
 * is always the value observed on-chain — never the amount the client asked for.
 */

export const SOMNIA_SHANNON_RPC_URL =
  process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network";

export const PROOFCAST_ANCHOR_CONTRACT = (
  process.env.SOMNIA_ANCHOR_CONTRACT || "0xe7da3a86ab86c3b5a09c992367083f1cec62d18e"
).toLowerCase();

// How long to wait for the anchor transaction to be mined. Somnia targets
// sub-second finality, so this is a generous ceiling rather than an expected wait.
const ANCHOR_CONFIRMATION_TIMEOUT_MS = 45_000;

export const somniaShannon = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [SOMNIA_SHANNON_RPC_URL] } },
  blockExplorers: {
    default: { name: "Shannon Explorer", url: "https://shannon-explorer.somnia.network" },
  },
});

export type VerifiedAnchor = {
  txHash: string;
  from: string;
  contractAddress: string;
  anchoredHash: string;
  stakeWei: string;
  blockNumber: string;
};

let cachedClient: ReturnType<typeof createPublicClient> | null = null;

function getSomniaClient() {
  if (!cachedClient) {
    cachedClient = createPublicClient({ chain: somniaShannon, transport: http(SOMNIA_SHANNON_RPC_URL) });
  }
  return cachedClient;
}

/** Exposed so tests can inject a stub client without reaching the network. */
export function setSomniaClientForTesting(client: any): void {
  cachedClient = client;
}

function isHexTxHash(value: string): value is Hash {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Re-reads an anchor transaction from Somnia and returns the facts it proves.
 * Throws when the transaction cannot be confirmed as a genuine anchor.
 */
export async function verifyAnchorTransaction(
  txHash: string,
  claimedFrom: string,
  expectedReceiptHash?: string | null,
): Promise<VerifiedAnchor> {
  const trimmed = txHash.trim();
  if (!isHexTxHash(trimmed)) {
    throw new Error("Anchor transaction hash is not a valid 32-byte transaction hash");
  }

  const client = getSomniaClient();

  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: trimmed,
      timeout: ANCHOR_CONFIRMATION_TIMEOUT_MS,
    });
  } catch {
    throw new Error("Anchor transaction could not be confirmed on Somnia within the confirmation window");
  }

  if (receipt.status !== "success") {
    throw new Error("Anchor transaction reverted on Somnia and was not recorded");
  }

  const to = receipt.to?.toLowerCase() ?? "";
  if (to !== PROOFCAST_ANCHOR_CONTRACT) {
    throw new Error("Anchor transaction did not target the ProofCast anchor contract");
  }

  const from = receipt.from.toLowerCase();
  if (claimedFrom.trim().toLowerCase() !== from) {
    throw new Error("Anchor transaction was not sent by the address claiming it");
  }

  // The authoritative stake is the value actually carried by the mined
  // transaction, so a client cannot report a stake it never paid.
  const transaction = await client.getTransaction({ hash: trimmed });

  // Decode the calldata so the hash actually written on-chain can be checked
  // against the receipt's own commitment digest. Without this a caller could
  // anchor an unrelated hash and still have the receipt marked as anchored.
  let anchoredHash: string;
  try {
    const decoded = decodeFunctionData({ abi: ANCHOR_ABI, data: transaction.input });
    anchoredHash = (decoded.args[0] as string).toLowerCase();
  } catch {
    throw new Error("Anchor transaction did not call a ProofCast anchoring function");
  }

  if (expectedReceiptHash && anchoredHash !== expectedReceiptHash.trim().toLowerCase()) {
    throw new Error("Anchor transaction recorded a different hash than this receipt's commitment digest");
  }

  return {
    txHash: trimmed,
    from,
    contractAddress: to,
    anchoredHash,
    stakeWei: transaction.value.toString(),
    blockNumber: receipt.blockNumber.toString(),
  };
}

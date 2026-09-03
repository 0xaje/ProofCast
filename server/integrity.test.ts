import { describe, it, expect, afterEach } from "vitest";
import { encodeFunctionData } from "viem";
import { mapSettlementOutcome } from "./resolutionWorker";
import { hashForecastCommitment } from "./receipts";
import { verifyAnchorTransaction, setSomniaClientForTesting, PROOFCAST_ANCHOR_CONTRACT } from "./somniaAnchor";

const WALLET = "0x1234567890abcdef1234567890abcdef12345678";
const TX = `0x${"a".repeat(64)}`;
const COMMITMENT = `0x${"b".repeat(64)}`;

const STUB_ABI = [
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
] as const;

function anchorCalldata(hash: string) {
  return encodeFunctionData({
    abi: STUB_ABI,
    functionName: "anchorReceipt",
    args: [hash as `0x${string}`, "market-1"],
  });
}

/** Minimal stub standing in for the Somnia public client. */
function stubClient(overrides: {
  receipt?: Partial<{ status: string; to: string; from: string; blockNumber: bigint }>;
  value?: bigint;
  throwOnWait?: boolean;
  anchoredHash?: string;
  input?: string;
}) {
  return {
    async waitForTransactionReceipt() {
      if (overrides.throwOnWait) throw new Error("timeout");
      return {
        status: "success",
        to: PROOFCAST_ANCHOR_CONTRACT,
        from: WALLET,
        blockNumber: 1n,
        ...overrides.receipt,
      };
    },
    async getTransaction() {
      return {
        value: overrides.value ?? 0n,
        input: overrides.input ?? anchorCalldata(overrides.anchoredHash ?? COMMITMENT),
      };
    },
  };
}

const baseCommitment = {
  marketId: "market-1",
  direction: "UP",
  probabilityBps: 6400,
  confidence: "HIGH",
  thesis: "Book is bid-heavy into expiry.",
  counterThesis: "Depth could evaporate on a single sweep.",
  commitmentTimestamp: 1_760_000_000,
  marketMidPercent: 61.25,
  marketBestBidPercent: 60.5,
  marketBestAskPercent: 62,
  snapshotAsOf: 1_760_000_000_000,
  signerAddress: WALLET,
};

afterEach(() => {
  setSomniaClientForTesting(null);
});

describe("Settlement outcome mapping", () => {
  it("resolves YES only on a conclusive settlement print", () => {
    expect(mapSettlementOutcome(99)).toBe("YES");
    expect(mapSettlementOutcome(100)).toBe("YES");
  });

  it("resolves NO only on a conclusive settlement print", () => {
    expect(mapSettlementOutcome(1)).toBe("NO");
    expect(mapSettlementOutcome(0)).toBe("NO");
  });

  it("records VOID rather than guessing a winner for an inconclusive price", () => {
    // The pre-fix implementation defaulted this entire range to YES, fabricating
    // outcomes that then fed Brier scores and leaderboard tiers.
    for (const price of [2, 25, 50, 61.25, 75, 98]) {
      expect(mapSettlementOutcome(price)).toBe("VOID");
    }
  });

  it("records VOID when no settlement price is available at all", () => {
    expect(mapSettlementOutcome(null)).toBe("VOID");
  });
});

describe("Somnia anchor verification", () => {
  it("rejects a transaction that is not a valid 32-byte hash", async () => {
    await expect(verifyAnchorTransaction("not-a-hash", WALLET)).rejects.toThrow(/valid 32-byte/);
  });

  it("rejects a transaction that reverted on-chain", async () => {
    setSomniaClientForTesting(stubClient({ receipt: { status: "reverted" } }));
    await expect(verifyAnchorTransaction(TX, WALLET)).rejects.toThrow(/reverted/);
  });

  it("rejects a transaction sent to a different contract", async () => {
    setSomniaClientForTesting(stubClient({ receipt: { to: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" } }));
    await expect(verifyAnchorTransaction(TX, WALLET)).rejects.toThrow(/anchor contract/);
  });

  it("rejects a transaction claimed by an address that did not send it", async () => {
    setSomniaClientForTesting(stubClient({ receipt: { from: "0x9999999999999999999999999999999999999999" } }));
    await expect(verifyAnchorTransaction(TX, WALLET)).rejects.toThrow(/not sent by the address/);
  });

  it("rejects a transaction that never confirmed", async () => {
    setSomniaClientForTesting(stubClient({ throwOnWait: true }));
    await expect(verifyAnchorTransaction(TX, WALLET)).rejects.toThrow(/could not be confirmed/);
  });

  it("reports the stake actually carried on-chain, not a claimed amount", async () => {
    setSomniaClientForTesting(stubClient({ value: 5_000_000_000_000_000_000n }));
    const verified = await verifyAnchorTransaction(TX, WALLET);
    expect(verified.stakeWei).toBe("5000000000000000000");
    expect(verified.from).toBe(WALLET);
  });

  it("reports a zero stake for a plain anchor with no value attached", async () => {
    setSomniaClientForTesting(stubClient({ value: 0n }));
    const verified = await verifyAnchorTransaction(TX, WALLET);
    expect(verified.stakeWei).toBe("0");
  });

  it("rejects a transaction that anchored a hash other than the receipt's digest", async () => {
    setSomniaClientForTesting(stubClient({ anchoredHash: `0x${"c".repeat(64)}` }));
    await expect(verifyAnchorTransaction(TX, WALLET, COMMITMENT)).rejects.toThrow(/different hash/);
  });

  it("accepts a transaction that anchored exactly the receipt's digest", async () => {
    setSomniaClientForTesting(stubClient({ anchoredHash: COMMITMENT }));
    const verified = await verifyAnchorTransaction(TX, WALLET, COMMITMENT);
    expect(verified.anchoredHash).toBe(COMMITMENT);
  });

  it("rejects calldata that is not a ProofCast anchoring call", async () => {
    setSomniaClientForTesting(stubClient({ input: "0xdeadbeef" }));
    await expect(verifyAnchorTransaction(TX, WALLET)).rejects.toThrow(/anchoring function/);
  });
});

describe("Forecast commitment digest", () => {
  it("produces a 32-byte hex digest suitable for a bytes32 anchor", () => {
    const digest = hashForecastCommitment(baseCommitment);
    expect(digest).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic for identical commitments", () => {
    expect(hashForecastCommitment(baseCommitment)).toBe(hashForecastCommitment(baseCommitment));
  });

  it("changes when any committed field changes", () => {
    const base = hashForecastCommitment(baseCommitment);
    const variants = [
      { ...baseCommitment, probabilityBps: 6401 },
      { ...baseCommitment, direction: "DOWN" },
      { ...baseCommitment, confidence: "LOW" },
      { ...baseCommitment, thesis: "Something else entirely." },
      { ...baseCommitment, counterThesis: "A different counter-thesis." },
      { ...baseCommitment, commitmentTimestamp: baseCommitment.commitmentTimestamp + 1 },
      { ...baseCommitment, marketMidPercent: 61.26 },
    ];
    for (const variant of variants) {
      expect(hashForecastCommitment(variant)).not.toBe(base);
    }
  });

  it("ignores wallet address casing so a checksummed address digests identically", () => {
    const upper = { ...baseCommitment, signerAddress: WALLET.toUpperCase().replace("0X", "0x") };
    expect(hashForecastCommitment(upper)).toBe(hashForecastCommitment(baseCommitment));
  });
});

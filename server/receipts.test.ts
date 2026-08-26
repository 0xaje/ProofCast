import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { DreamDexMarketSnapshot, DreamDexSnapshot } from "./dreamdex";
import { decisionReceipts, forecasts, marketSnapshots } from "../drizzle/schema";
import { buildMarketSnapshotInsert, createDecisionReceipt, receiptBelongsToUser } from "./receipts";
import { appRouter, receiptInputSchema } from "./routers";

const market: DreamDexMarketSnapshot = {
  marketId: "market-1",
  marketAddress: "0xmarket",
  poolAddress: "0xpool",
  asset: "BTC",
  question: "BTC closes above its opening price",
  indexedStatus: "Trading",
  marketState: "TRADING",
  tradingStart: 1_700_000_000_000,
  expiry: 1_700_000_600_000,
  secondsToExpiry: 500,
  lastPricePercent: 61.25,
  bestBidPercent: 60.5,
  bestAskPercent: 62,
  midPercent: 61.25,
  spreadBps: 246,
  yesBids: [{ pricePercent: 60.5, quantity: "12.5" }],
  yesAsks: [{ pricePercent: 62, quantity: "8" }],
};

const liveSnapshot: DreamDexSnapshot = {
  state: "LIVE",
  asOf: 1_700_000_100_000,
  ageMs: 0,
  network: "somnia-mainnet",
  chainId: 5031,
  provenance: {
    indexer: "https://example.test/indexer",
    orderBook: "on-chain binary pool read",
    method: "official @somnia-chain/markets-sdk (read-only)",
  },
  markets: [market],
  message: "Verified snapshot",
};

function unauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Decision Receipt v1 input and evidence safeguards", () => {
  it("accepts a bounded probability and rejects malformed commitments", () => {
    expect(receiptInputSchema.safeParse({
      marketId: "market-1",
      direction: "UP",
      probabilityBps: 6_125,
      confidence: "HIGH",
      thesis: "The market has sustained bid support.",
      counterThesis: "The visible book can thin before expiry.",
    }).success).toBe(true);

    expect(receiptInputSchema.safeParse({
      marketId: "market-1",
      direction: "UP",
      probabilityBps: 10_000,
      confidence: "HIGH",
      thesis: "x",
      counterThesis: "y",
    }).success).toBe(false);
  });

  it("normalizes source percentages to integer basis points and preserves provenance", () => {
    const values = buildMarketSnapshotInsert(liveSnapshot, market);
    expect(values.midBps).toBe(6_125);
    expect(values.bestBidBps).toBe(6_050);
    expect(values.bestAskBps).toBe(6_200);
    expect(values.provenanceJson).toContain("somnia-chain");
    expect(values.orderBookJson).toContain("60.5");
  });

  it("rejects stale or non-trading evidence before any database write", async () => {
    const stale = { ...liveSnapshot, state: "STALE" as const };
    await expect(createDecisionReceipt(1, {
      marketId: "market-1",
      direction: "UP",
      probabilityBps: 6_125,
      confidence: "HIGH",
      thesis: "thesis",
      counterThesis: "counter",
    }, stale)).rejects.toThrow("fresh verified market snapshot");

    const locked = { ...liveSnapshot, markets: [{ ...market, marketState: "LOCKED" as const }] };
    await expect(createDecisionReceipt(1, {
      marketId: "market-1",
      direction: "UP",
      probabilityBps: 6_125,
      confidence: "HIGH",
      thesis: "thesis",
      counterThesis: "counter",
    }, locked)).rejects.toThrow("selected market is trading");
  });
});

describe("Decision Receipt v1 persistence safeguards", () => {
  it("keeps receipt ownership scoped to the authenticated user", () => {
    expect(receiptBelongsToUser({ userId: 7 }, 7)).toBe(true);
    expect(receiptBelongsToUser({ userId: 7 }, 8)).toBe(false);
  });

  it("rolls back staged writes when a later receipt insert fails", async () => {
    const staged = { snapshots: 0, forecasts: 0, receipts: 0 };
    const database = {
      transaction: async (callback: (tx: unknown) => Promise<number>) => {
        const pending = { ...staged };
        const tx = {
          insert: (table: unknown) => ({
            values: async () => {
              if (table === marketSnapshots) {
                pending.snapshots += 1;
                return [{ insertId: 1 }];
              }
              if (table === forecasts) {
                throw new Error("simulated forecast write failure");
              }
              if (table === decisionReceipts) {
                pending.receipts += 1;
                return [{ insertId: 1 }];
              }
              return [{ insertId: 1 }];
            },
          }),
        };
        try {
          const result = await callback(tx);
          Object.assign(staged, pending);
          return result;
        } catch (error) {
          throw error;
        }
      },
    };

    await expect(createDecisionReceipt(1, {
      marketId: "market-1",
      direction: "UP",
      probabilityBps: 6_125,
      confidence: "HIGH",
      thesis: "thesis",
      counterThesis: "counter",
    }, liveSnapshot, database as never)).rejects.toThrow("simulated forecast write failure");
    expect(staged).toEqual({ snapshots: 0, forecasts: 0, receipts: 0 });
  });
});

describe("Decision Receipt v1 protected procedures", () => {
  it("requires authentication for create, list, and detail reads", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    const input = {
      marketId: "market-1",
      direction: "UP" as const,
      probabilityBps: 6_125,
      confidence: "HIGH" as const,
      thesis: "thesis",
      counterThesis: "counter",
    };

    await expect(caller.receipts.create(input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.receipts.listMine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.receipts.getMineById({ id: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { DreamDexMarketSnapshot, DreamDexSnapshot } from "./dreamdex";
import { decisionReceipts, forecasts, marketSnapshots } from "../drizzle/schema";
import { buildMarketSnapshotInsert, createDecisionReceipt, isVerifiedResolution, nextRevisionNumber, pickVerifiedOwnedResolution, preservesOriginalForecast, receiptBelongsToUser, resolutionBelongsToUser, revisionBelongsToUser, validateEvidenceSourceUrl, verifyResolutionEvidence } from "./receipts";
import { appRouter, receiptInputSchema, resolutionEvidenceInputSchema, revisionInputSchema } from "./routers";
import { calculateCalibrationMetrics, scoreVerifiedOutcome, selectForecastAtResolution } from "./scoring";

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

describe("Decision Receipt revision and resolution safeguards", () => {
  it("creates a monotonic revision chain and only verified evidence counts", () => {
    expect(nextRevisionNumber([])).toBe(1);
    expect(nextRevisionNumber([{ revisionNumber: 1 }, { revisionNumber: 3 }])).toBe(4);
    expect(isVerifiedResolution({ verificationStatus: "SUBMITTED" })).toBe(false);
    expect(isVerifiedResolution({ verificationStatus: "VERIFIED" })).toBe(true);
    expect(pickVerifiedOwnedResolution(7, [{ userId: 8, verificationStatus: "VERIFIED", outcome: "YES" }, { userId: 7, verificationStatus: "VERIFIED", outcome: "NO" }])).toMatchObject({ userId: 7, outcome: "NO" });
    expect(revisionBelongsToUser({ userId: 7 }, 7)).toBe(true);
    expect(revisionBelongsToUser({ userId: 7 }, 8)).toBe(false);
    expect(resolutionBelongsToUser({ userId: 7 }, 7)).toBe(true);
    expect(resolutionBelongsToUser({ userId: 7 }, 8)).toBe(false);
    expect(preservesOriginalForecast(12, { parentForecastId: 12 })).toBe(true);
    expect(preservesOriginalForecast(12, { parentForecastId: 13 })).toBe(false);
    expect(revisionInputSchema.safeParse({ direction: "DOWN", probabilityBps: 4_500, confidence: "LOW", thesis: "updated", counterThesis: "risk" }).success).toBe(true);
    expect(resolutionEvidenceInputSchema.safeParse({ receiptId: 1, outcome: "YES", sourceUrl: "https://example.com/outcome", evidenceSummary: "A source supports the outcome." }).success).toBe(true);
    expect(resolutionEvidenceInputSchema.safeParse({ receiptId: 1, outcome: "YES", sourceUrl: "not-a-url", evidenceSummary: "x" }).success).toBe(false);
  });

  it("allows one submitted resolution to be reviewed once, then blocks a second review", async () => {
    let row = { id: 9, receiptId: 2, userId: 7, outcome: "YES", verificationStatus: "SUBMITTED", sourceUrl: "https://example.com", evidenceSummary: "evidence", verifiedBy: null, verifiedAt: null, createdAt: new Date() };
    const database = {
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [row] }),
        }),
      }),
      update: () => ({
        set: (values: Record<string, unknown>) => ({ where: async () => { row = { ...row, ...values } as typeof row; } }),
      }),
    };

    const verified = await verifyResolutionEvidence(99, 9, "VERIFIED", database as never);
    expect(verified.verificationStatus).toBe("VERIFIED");
    expect(verified.verifiedBy).toBe("99");
    await expect(verifyResolutionEvidence(99, 9, "REJECTED", database as never)).rejects.toThrow("Only submitted resolution evidence");
  });
});

describe("Resolution-time scoring and evidence sources", () => {
  it("scores the latest forecast version active when evidence was verified", () => {
    const originalAt = new Date("2026-01-01T00:00:00.000Z");
    const revisionAt = new Date("2026-01-02T00:00:00.000Z");
    const verifiedAt = new Date("2026-01-03T00:00:00.000Z");
    expect(selectForecastAtResolution({ direction: "UP", probabilityBps: 8_000, committedAt: originalAt } as never, [{ direction: "DOWN", probabilityBps: 3_000, createdAt: revisionAt }], verifiedAt)).toMatchObject({ direction: "DOWN", probabilityBps: 3_000 });
    expect(selectForecastAtResolution({ direction: "UP", probabilityBps: 8_000, committedAt: originalAt } as never, [{ direction: "DOWN", probabilityBps: 3_000, createdAt: new Date("2026-01-04T00:00:00.000Z") }], verifiedAt)).toMatchObject({ direction: "UP", probabilityBps: 8_000 });
  });

  it("accepts public HTTPS sources and rejects unsafe or credentialed URLs", () => {
    expect(validateEvidenceSourceUrl(" https://example.com/outcome ")).toBe("https://example.com/outcome");
    expect(() => validateEvidenceSourceUrl("http://example.com/outcome")).toThrow("HTTPS");
    expect(() => validateEvidenceSourceUrl("https://user:pass@example.com/outcome")).toThrow("credentials");
    expect(() => validateEvidenceSourceUrl("https://localhost/outcome")).toThrow("public HTTPS");
  });
});

describe("Verified outcome scoring and calibration", () => {
  it("builds a chronological trend only from verified scored outcomes", () => {
    const sample = Array.from({ length: 5 }, (_, index) => scoreVerifiedOutcome(index + 1, { probabilityBps: 5_000 + index * 500, direction: "UP" }, { outcome: "YES", verificationStatus: "VERIFIED" }));
    const metrics = calculateCalibrationMetrics(sample.map((item, index) => ({ ...item!, resolvedAt: new Date(Date.UTC(2026, 0, index + 1)) })), 0);
    expect(metrics.calibrationStatus).toBe("READY");
    expect(metrics.trend).toHaveLength(5);
    expect(metrics.trend.at(-1)).toMatchObject({ verifiedCount: 5, directionalAccuracyPct: 100 });
  });

  it("scores only verified non-void outcomes and computes transparent metrics", () => {
    const correct = scoreVerifiedOutcome(11, { probabilityBps: 8_000, direction: "UP" }, { outcome: "YES", verificationStatus: "VERIFIED" });
    const incorrect = scoreVerifiedOutcome(12, { probabilityBps: 8_000, direction: "UP" }, { outcome: "NO", verificationStatus: "VERIFIED" });
    expect(correct).toMatchObject({ receiptId: 11, brierScoreBps: 400, directionalCorrect: true });
    expect(incorrect).toMatchObject({ receiptId: 12, brierScoreBps: 6_400, directionalCorrect: false });
    expect(scoreVerifiedOutcome(13, { probabilityBps: 5_000, direction: "UP" }, { outcome: "YES", verificationStatus: "SUBMITTED" })).toBeNull();
    expect(scoreVerifiedOutcome(14, { probabilityBps: 5_000, direction: "UP" }, { outcome: "VOID", verificationStatus: "VERIFIED" })).toBeNull();

    const metrics = calculateCalibrationMetrics([correct!, incorrect!], 2);
    expect(metrics.verifiedCount).toBe(2);
    expect(metrics.excludedCount).toBe(2);
    expect(metrics.directionalAccuracyPct).toBe(50);
    expect(metrics.meanBrierScoreBps).toBe(3_400);
    expect(metrics.calibrationStatus).toBe("INSUFFICIENT_SAMPLE");
    expect(metrics.bins.find(bin => bin.count === 2)).toMatchObject({ predictedBps: 8_000, observedBps: 5_000 });
  });
});

describe("Decision Receipt v1 protected procedures", () => {
  it("requires authentication for create, list, detail, revise, and evidence submission", async () => {
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
    await expect(caller.receipts.revise({ receiptId: 1, direction: "UP", probabilityBps: 6_000, confidence: "HIGH", thesis: "updated", counterThesis: "risk" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.receipts.submitResolutionEvidence({ receiptId: 1, outcome: "YES", sourceUrl: "https://example.com", evidenceSummary: "evidence" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.receipts.metrics()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.receipts.verifyResolutionEvidence({ resolutionId: 1, status: "VERIFIED" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.receipts.pendingReview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

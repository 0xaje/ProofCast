import { describe, expect, it } from "vitest";
import type { DreamDexMarketSnapshot } from "./dreamdex";
import { getHistoricalBenchmarkList, getModelArenaRankings } from "./eventforge/benchmark";
import { MODEL_SPECS, runMultiModelAnalysis } from "./eventforge/models/registry";

function buildMockSnapshot(overrides?: Partial<DreamDexMarketSnapshot>): DreamDexMarketSnapshot {
  const now = Date.now();
  return {
    marketId: "0xmock-market-som-001",
    marketAddress: "0x1111111111111111111111111111111111111111",
    poolAddress: "0x2222222222222222222222222222222222222222",
    asset: "SOM",
    question: "Will SOM break $1.50 before end of epoch?",
    indexedStatus: "Trading",
    marketState: "TRADING",
    tradingStart: now - 3600 * 1000,
    expiry: now + 3600 * 1000 * 24,
    secondsToExpiry: 3600 * 24,
    lastPricePercent: 62.0,
    bestBidPercent: 61.0,
    bestAskPercent: 63.0,
    midPercent: 62.0,
    spreadBps: 200,
    yesBids: [
      { pricePercent: 61.0, quantity: "500.0" },
      { pricePercent: 60.0, quantity: "300.0" },
    ],
    yesAsks: [
      { pricePercent: 63.0, quantity: "200.0" },
      { pricePercent: 64.0, quantity: "150.0" },
    ],
    ...overrides,
  };
}

describe("EventForge Multi-Model Benchmark Suite", () => {
  it("executes all registered models without requiring external API keys", async () => {
    const snapshot = buildMockSnapshot();
    const result = await runMultiModelAnalysis(snapshot);

    expect(result.marketId).toBe(snapshot.marketId);
    expect(result.marketMidBps).toBe(6200);

    // Verify all 5 model predictions are present
    const modelKeys = Object.keys(result.models);
    expect(modelKeys).toContain("deterministic");
    expect(modelKeys).toContain("gemini-1.5-flash");
    expect(modelKeys).toContain("deepseek-r1");
    expect(modelKeys).toContain("claude-3.5-sonnet");
    expect(modelKeys).toContain("ensemble-oracle");

    // Verify probabilities are bounded between 1% and 99%
    for (const key of modelKeys) {
      const pred = result.models[key as keyof typeof result.models];
      expect(pred.probabilityBps).toBeGreaterThanOrEqual(100);
      expect(pred.probabilityBps).toBeLessThanOrEqual(9900);
      expect(pred.bullCase.length).toBeGreaterThan(10);
      expect(pred.bearCase.length).toBeGreaterThan(10);
      expect(pred.counterThesis.length).toBeGreaterThan(10);
      expect(pred.keyRisks.length).toBeGreaterThan(0);
    }
  });

  it("calculates consensus metrics and disagreement spread accurately", async () => {
    const snapshot = buildMockSnapshot();
    const result = await runMultiModelAnalysis(snapshot);

    expect(result.consensus.meanProbabilityBps).toBeGreaterThan(0);
    expect(result.consensus.medianProbabilityBps).toBeGreaterThan(0);
    expect(result.consensus.disagreementSpreadBps).toBeGreaterThanOrEqual(0);
    expect(["STRONG", "MODERATE", "DIVERGENT"]).toContain(result.consensus.consensusStrength);
    expect(["BULLISH_EDGE", "BEARISH_EDGE", "NEUTRAL_ALIGNED"]).toContain(result.consensus.consensusDirection);
  });

  it("produces zero-cost offline analytical fallback with valid inference engine tag", async () => {
    const snapshot = buildMockSnapshot();
    const result = await runMultiModelAnalysis(snapshot);

    const deepseek = result.models["deepseek-r1"];
    expect(["REAL_LLM", "BUILTIN_ANALYTICAL"]).toContain(deepseek.inferenceEngine);
    expect(deepseek.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("generates calibrated AI Model Arena rankings with Brier scores and form", () => {
    const rankings = getModelArenaRankings();
    expect(rankings.length).toBe(5);

    // Ranks should be 1 to 5
    const ranks = rankings.map((r) => r.rank);
    expect(ranks).toEqual([1, 2, 3, 4, 5]);

    // Check ranking fields
    for (const r of rankings) {
      expect(r.meanBrierScoreBps).toBeGreaterThan(0);
      expect(r.directionalAccuracyPct).toBeGreaterThanOrEqual(0);
      expect(r.directionalAccuracyPct).toBeLessThanOrEqual(100);
      expect(r.recentForm.length).toBeGreaterThan(0);
      expect(r.brierTrend.length).toBeGreaterThan(0);
      expect(MODEL_SPECS[r.modelId]).toBeDefined();
    }
  });

  it("retrieves historical benchmark market records correctly", () => {
    const history = getHistoricalBenchmarkList();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].marketId).toBeDefined();
    expect(history[0].resolvedOutcome).toMatch(/^(YES|NO)$/);
  });
});

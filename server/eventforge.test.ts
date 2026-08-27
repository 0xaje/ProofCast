import { describe, expect, it } from "vitest";
import { computeDeterministicModel } from "./eventforge/model";
import { generateEventForgeReasoning } from "./eventforge/reasoning";
import { evaluateMarketQuality } from "./marketQuality";
import { calculateExecutableEdge } from "./executableEdge";
import type { DreamDexMarketSnapshot } from "./dreamdex";

const mockSnapshot: DreamDexMarketSnapshot = {
  marketId: "0x1234567890abcdef",
  marketAddress: "0xmarketaddress",
  poolAddress: "0xpooladdress",
  asset: "SOM",
  question: "Will Somnia TVL exceed $100M before Q4 2026?",
  indexedStatus: "Trading",
  marketState: "TRADING",
  tradingStart: Date.now() - 1000 * 3600,
  expiry: Date.now() + 1000 * 3600 * 24,
  secondsToExpiry: 86400,
  lastPricePercent: 62.5,
  bestBidPercent: 61.0,
  bestAskPercent: 63.0,
  midPercent: 62.0,
  spreadBps: 200,
  yesBids: [
    { pricePercent: 61.0, quantity: "150.0" },
    { pricePercent: 60.0, quantity: "200.0" },
  ],
  yesAsks: [
    { pricePercent: 63.0, quantity: "120.0" },
    { pricePercent: 64.0, quantity: "180.0" },
  ],
};

describe("EventForge Layer A Deterministic Model", () => {
  it("produces deterministic output for identical input", () => {
    const out1 = computeDeterministicModel(mockSnapshot, 1700000000000);
    const out2 = computeDeterministicModel(mockSnapshot, 1700000000000);
    expect(out1.modelProbabilityBps).toBe(out2.modelProbabilityBps);
    expect(out1.modelConfidence).toBe(out2.modelConfidence);
    expect(out1.orderBookImbalance).toBe(out2.orderBookImbalance);
  });

  it("assigns HIGH confidence when liquidity is deep and spread is tight", () => {
    const out = computeDeterministicModel(mockSnapshot, 1700000000000);
    expect(out.modelConfidence).toBe("HIGH");
    expect(out.spreadBps).toBe(200);
    expect(out.modelProbabilityBps).toBeGreaterThanOrEqual(100);
    expect(out.modelProbabilityBps).toBeLessThanOrEqual(9900);
  });

  it("reflects order book imbalance in the probability shift", () => {
    const out = computeDeterministicModel(mockSnapshot, 1700000000000);
    // Bids (350) > Asks (300) -> Positive imbalance
    expect(out.orderBookImbalance).toBeGreaterThan(0);
    expect(out.modelProbabilityBps).toBeGreaterThanOrEqual(6200);
  });
});

describe("EventForge Layer B Structured Reasoning", () => {
  it("generates structured bull/bear/risks based on validated input", () => {
    const model = computeDeterministicModel(mockSnapshot, 1700000000000);
    return generateEventForgeReasoning(mockSnapshot, model).then(reasoning => {
      expect(reasoning.bullCase).toContain("YES");
      expect(reasoning.bearCase).toContain("Downside liquidity");
      expect(reasoning.counterThesis).toBeDefined();
      expect(reasoning.keyRisks.length).toBeGreaterThanOrEqual(2);
      expect(reasoning.disagreementAnalysis).toBeDefined();
      expect(reasoning.uncertaintyLevel).toBeDefined();
    });
  });
});

describe("Market Quality Engine", () => {
  it("classifies liquid tight-spread market as TRADEABLE", () => {
    const evalResult = evaluateMarketQuality(mockSnapshot);
    expect(evalResult.state).toBe("TRADEABLE");
    expect(evalResult.spreadOk).toBe(true);
    expect(evalResult.depthOk).toBe(true);
    expect(evalResult.score).toBeGreaterThanOrEqual(70);
  });

  it("downgrades illiquid wide-spread market to WATCH or NO_TRADE", () => {
    const illiquidSnapshot: DreamDexMarketSnapshot = {
      ...mockSnapshot,
      spreadBps: 850,
      yesBids: [{ pricePercent: 50, quantity: "2.0" }],
      yesAsks: [{ pricePercent: 65, quantity: "1.0" }],
    };
    const evalResult = evaluateMarketQuality(illiquidSnapshot);
    expect(evalResult.state).not.toBe("TRADEABLE");
    expect(evalResult.spreadOk).toBe(false);
  });
});

describe("Executable Edge Engine", () => {
  it("accurately computes subjective gap vs real executable edge", () => {
    const userForecastBps = 7500; // User believes 75%
    const modelBps = 6350; // Model estimate 63.5%
    
    // User direction UP (buying YES)
    const edge = calculateExecutableEdge(userForecastBps, "UP", mockSnapshot, modelBps);
    
    // Market mid is 62%, best ask is 63%
    expect(edge.subjectiveThesisGapBps).toBe(1300); // 7500 - 6200
    expect(edge.executablePriceBps).toBe(6300); // Crosses ask at 63%
    expect(edge.executableEdgeBps).toBeLessThan(edge.subjectiveThesisGapBps); // Edge is reduced by spread/slippage
    expect(edge.isExecutableEdgePositive).toBe(true);
  });
});

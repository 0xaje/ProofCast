import type { DreamDexMarketSnapshot } from "../../dreamdex";
import { computeDeterministicModel } from "../model";
import type { ModelPrediction, ModelProvider, ModelSpec } from "./types";

export const deterministicSpec: ModelSpec = {
  id: "deterministic",
  name: "EventForge Microstructure",
  family: "MICROSTRUCTURE",
  provider: "Built-in Microstructure",
  description: "Pure deterministic order-book depth imbalance, bid/ask spread penalty, and time-decay physics.",
  badgeColor: "#d7f36b",
  avatarText: "EF",
};

export const deterministicProvider: ModelProvider = {
  spec: deterministicSpec,
  async predict(snapshot: DreamDexMarketSnapshot): Promise<ModelPrediction> {
    const start = Date.now();
    const model = computeDeterministicModel(snapshot);
    const midPercent = snapshot.midPercent ?? snapshot.lastPricePercent ?? 50;
    const modelProbPercent = model.modelProbabilityBps / 100;
    const diff = modelProbPercent - midPercent;

    const imbalancePercent = (model.orderBookImbalance * 100).toFixed(1);
    const bullCase = `Order-book depth exhibits ${model.orderBookImbalance > 0 ? "+" : ""}${imbalancePercent}% bid pressure. Resting ask liquidity at ${snapshot.bestAskPercent ?? midPercent}% is vulnerable to upside exhaustion.`;
    const bearCase = `Spread friction at ${model.spreadBps ?? "N/A"} bps limits downside absorption if sudden ${snapshot.asset} volatility tests bid depth at ${snapshot.bestBidPercent ?? midPercent}%.`;
    const counterThesis = `Market participants may be misjudging gamma decay with ${Math.round(snapshot.secondsToExpiry / 60)} minutes remaining to expiry.`;

    const keyRisks = [
      `Book depth concentration: ${snapshot.yesBids.length + snapshot.yesAsks.length} active price levels visible.`,
      `Spread penalty: ${model.spreadBps ?? 400} bps gap between best bid and ask.`,
      `Time decay horizon: Expiry set to ${new Date(snapshot.expiry).toISOString()}.`,
    ];

    let uncertaintyLevel: "LOW" | "MODERATE" | "HIGH" | "EXTREME" = "MODERATE";
    if ((model.spreadBps ?? 0) > 600 || snapshot.secondsToExpiry < 300) uncertaintyLevel = "EXTREME";
    else if ((model.spreadBps ?? 0) > 300) uncertaintyLevel = "HIGH";
    else if (model.modelConfidence === "HIGH") uncertaintyLevel = "LOW";

    return {
      modelId: "deterministic",
      modelName: deterministicSpec.name,
      probabilityBps: model.modelProbabilityBps,
      confidence: model.modelConfidence,
      uncertaintyLevel,
      bullCase,
      bearCase,
      counterThesis,
      keyRisks,
      inferenceEngine: "BUILTIN_ANALYTICAL",
      latencyMs: Math.max(1, Date.now() - start),
      generatedAt: Date.now(),
    };
  },
};

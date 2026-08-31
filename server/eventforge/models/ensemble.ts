import type { DreamDexMarketSnapshot } from "../../dreamdex";
import type { ModelPrediction, ModelProvider, ModelSpec } from "./types";

export const ensembleSpec: ModelSpec = {
  id: "ensemble-oracle",
  name: "ProofCast Meta-Oracle",
  family: "META_ENSEMBLE",
  provider: "ProofCast Ensemble",
  description: "Optimal calibration-weighted meta-ensemble combining deterministic, Bayesian, and LLM signals.",
  badgeColor: "#38bdf8",
  avatarText: "MO",
  isEnsemble: true,
};

export function createEnsemblePrediction(
  snapshot: DreamDexMarketSnapshot,
  individualPredictions: ModelPrediction[]
): ModelPrediction {
  const start = Date.now();
  if (individualPredictions.length === 0) {
    const midBps = Math.round((snapshot.midPercent ?? 50) * 100);
    return {
      modelId: "ensemble-oracle",
      modelName: ensembleSpec.name,
      probabilityBps: midBps,
      confidence: "LOW",
      uncertaintyLevel: "MODERATE",
      bullCase: "Insufficient model signals available to construct ensemble consensus.",
      bearCase: "Insufficient model signals available to construct ensemble consensus.",
      counterThesis: "Maintain caution until multi-model consensus is established.",
      keyRisks: ["Model availability constraint."],
      inferenceEngine: "BUILTIN_ANALYTICAL",
      latencyMs: 1,
      generatedAt: Date.now(),
    };
  }

  // Weights optimized by calibration and stability
  // Deterministic (35%), DeepSeek (25%), Gemini (20%), Claude (20%)
  const weights: Record<string, number> = {
    deterministic: 0.35,
    "deepseek-r1": 0.25,
    "gemini-1.5-flash": 0.20,
    "claude-3.5-sonnet": 0.20,
  };

  let totalWeight = 0;
  let weightedProbSum = 0;

  for (const pred of individualPredictions) {
    const w = weights[pred.modelId] ?? 0.20;
    weightedProbSum += pred.probabilityBps * w;
    totalWeight += w;
  }

  const ensembleProbBps = Math.round(weightedProbSum / (totalWeight || 1));
  const midBps = Math.round((snapshot.midPercent ?? 50) * 100);
  const diffFromMidBps = ensembleProbBps - midBps;

  const highConfidenceCount = individualPredictions.filter((p) => p.confidence === "HIGH").length;
  const ensembleConfidence = highConfidenceCount >= 2 ? "HIGH" : individualPredictions.length >= 3 ? "MEDIUM" : "LOW";

  const ensembleBullCase = `Consensus across ${individualPredictions.length} models confirms net positive expectation of ${(ensembleProbBps / 100).toFixed(1)}% (${diffFromMidBps >= 0 ? "+" : ""}${diffFromMidBps} bps vs market).`;
  const ensembleBearCase = `Downside divergence noted in ${individualPredictions.filter((p) => p.probabilityBps < midBps).length} of ${individualPredictions.length} models, highlighting tail liquidity risk.`;
  const ensembleCounterThesis = `Cross-model meta analysis indicates market price has a ${Math.abs(diffFromMidBps)} bps mispricing margin relative to multi-model synthesis.`;

  const allRisks = individualPredictions.flatMap((p) => p.keyRisks);
  const uniqueRisks = Array.from(new Set(allRisks)).slice(0, 3);

  return {
    modelId: "ensemble-oracle",
    modelName: ensembleSpec.name,
    probabilityBps: ensembleProbBps,
    confidence: ensembleConfidence,
    uncertaintyLevel: Math.abs(diffFromMidBps) > 400 ? "HIGH" : "LOW",
    bullCase: ensembleBullCase,
    bearCase: ensembleBearCase,
    counterThesis: ensembleCounterThesis,
    keyRisks: uniqueRisks,
    inferenceEngine: "BUILTIN_ANALYTICAL",
    latencyMs: Date.now() - start,
    generatedAt: Date.now(),
  };
}

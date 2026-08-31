import type { DreamDexMarketSnapshot } from "../../dreamdex";
import { claudeProvider, claudeSpec } from "./claude";
import { deepseekProvider, deepseekSpec } from "./deepseek";
import { deterministicProvider, deterministicSpec } from "./deterministic";
import { createEnsemblePrediction, ensembleSpec } from "./ensemble";
import { geminiProvider, geminiSpec } from "./gemini";
import type { ModelId, ModelPrediction, ModelProvider, ModelSpec, MultiModelAnalysisResult } from "./types";

export const MODEL_SPECS: Record<ModelId, ModelSpec> = {
  deterministic: deterministicSpec,
  "gemini-1.5-flash": geminiSpec,
  "deepseek-r1": deepseekSpec,
  "claude-3.5-sonnet": claudeSpec,
  "ensemble-oracle": ensembleSpec,
};

export const INDIVIDUAL_PROVIDERS: ModelProvider[] = [
  deterministicProvider,
  geminiProvider,
  deepseekProvider,
  claudeProvider,
];

export async function runMultiModelAnalysis(snapshot: DreamDexMarketSnapshot): Promise<MultiModelAnalysisResult> {
  const midPercent = snapshot.midPercent ?? snapshot.lastPricePercent ?? 50;
  const marketMidBps = Math.round(midPercent * 100);

  // Run all individual providers concurrently
  const individualResults = await Promise.all(
    INDIVIDUAL_PROVIDERS.map(async (provider) => {
      try {
        return await provider.predict(snapshot);
      } catch (err) {
        // Safe fallback
        return deterministicProvider.predict(snapshot);
      }
    })
  );

  // Generate Ensemble Meta-Oracle prediction
  const ensembleResult = createEnsemblePrediction(snapshot, individualResults);

  const modelsRecord: Record<ModelId, ModelPrediction> = {
    deterministic: individualResults.find((r) => r.modelId === "deterministic")!,
    "gemini-1.5-flash": individualResults.find((r) => r.modelId === "gemini-1.5-flash")!,
    "deepseek-r1": individualResults.find((r) => r.modelId === "deepseek-r1")!,
    "claude-3.5-sonnet": individualResults.find((r) => r.modelId === "claude-3.5-sonnet")!,
    "ensemble-oracle": ensembleResult,
  };

  const probValues = individualResults.map((r) => r.probabilityBps);
  const minProb = Math.min(...probValues);
  const maxProb = Math.max(...probValues);
  const sumProb = probValues.reduce((a, b) => a + b, 0);
  const meanProbBps = Math.round(sumProb / probValues.length);

  const sorted = [...probValues].sort((a, b) => a - b);
  const medianProbBps =
    sorted.length % 2 === 0
      ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)];

  const disagreementSpreadBps = maxProb - minProb;

  const consensusDirection: "BULLISH_EDGE" | "BEARISH_EDGE" | "NEUTRAL_ALIGNED" =
    ensembleResult.probabilityBps - marketMidBps > 150
      ? "BULLISH_EDGE"
      : marketMidBps - ensembleResult.probabilityBps > 150
        ? "BEARISH_EDGE"
        : "NEUTRAL_ALIGNED";

  const consensusStrength: "STRONG" | "MODERATE" | "DIVERGENT" =
    disagreementSpreadBps < 300 ? "STRONG" : disagreementSpreadBps < 650 ? "MODERATE" : "DIVERGENT";

  return {
    marketId: snapshot.marketId,
    question: snapshot.question,
    asset: snapshot.asset,
    marketMidBps,
    marketSpreadBps: snapshot.spreadBps,
    models: modelsRecord,
    consensus: {
      meanProbabilityBps: meanProbBps,
      medianProbabilityBps: medianProbBps,
      disagreementSpreadBps,
      ensembleProbabilityBps: ensembleResult.probabilityBps,
      consensusDirection,
      consensusStrength,
    },
  };
}

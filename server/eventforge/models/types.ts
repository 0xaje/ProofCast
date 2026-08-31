import type { DreamDexMarketSnapshot } from "../../dreamdex";
import type { EventForgeConfidence } from "../model";
import type { UncertaintyLevel } from "../reasoning";

export type ModelId =
  | "deterministic"
  | "gemini-1.5-flash"
  | "deepseek-r1"
  | "claude-3.5-sonnet"
  | "ensemble-oracle";

export interface ModelSpec {
  id: ModelId;
  name: string;
  family: "MICROSTRUCTURE" | "REASONING_LLM" | "QUANT_COT" | "ANALYTICAL_LLM" | "META_ENSEMBLE";
  provider: "Built-in Microstructure" | "Google DeepMind" | "DeepSeek AI" | "Anthropic" | "ProofCast Ensemble";
  description: string;
  badgeColor: string;
  avatarText: string;
  isEnsemble?: boolean;
}

export interface ModelPrediction {
  modelId: ModelId;
  modelName: string;
  probabilityBps: number; // in basis points (e.g. 6250 = 62.5%)
  confidence: EventForgeConfidence;
  uncertaintyLevel: UncertaintyLevel;
  bullCase: string;
  bearCase: string;
  counterThesis: string;
  keyRisks: string[];
  inferenceEngine: "REAL_LLM" | "BUILTIN_ANALYTICAL";
  latencyMs: number;
  generatedAt: number;
}

export interface MultiModelAnalysisResult {
  marketId: string;
  question: string;
  asset: string;
  marketMidBps: number;
  marketSpreadBps: number | null;
  models: Record<ModelId, ModelPrediction>;
  consensus: {
    meanProbabilityBps: number;
    medianProbabilityBps: number;
    disagreementSpreadBps: number; // Max prob - Min prob in bps
    ensembleProbabilityBps: number;
    consensusDirection: "BULLISH_EDGE" | "BEARISH_EDGE" | "NEUTRAL_ALIGNED";
    consensusStrength: "STRONG" | "MODERATE" | "DIVERGENT";
  };
}

export interface ModelArenaRanking {
  rank: number;
  modelId: ModelId;
  modelName: string;
  family: string;
  provider: string;
  badgeColor: string;
  avatarText: string;
  totalPredictions: number;
  meanBrierScoreBps: number; // lower is better
  directionalAccuracyPct: number; // higher is better
  edgeOverMarketBps: number; // bps of accuracy improvement over market baseline
  calibrationStatus: "HIGHLY_CALIBRATED" | "MODERATE" | "LEARNING";
  calibrationErrorPct: number;
  recentForm: ("WIN" | "LOSS")[];
  brierTrend: { date: string; brierScoreBps: number }[];
}

export interface ModelProvider {
  spec: ModelSpec;
  predict(snapshot: DreamDexMarketSnapshot): Promise<ModelPrediction>;
}

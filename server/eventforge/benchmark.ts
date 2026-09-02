import { MODEL_SPECS } from "./models/registry";
import type { ModelArenaRanking, ModelId } from "./models/types";

// SYNTHETIC BENCHMARK FIXTURE — NOT LIVE DATA.
//
// The entries below are hand-authored illustrative scenarios used to demonstrate
// the Brier-ranking mechanism before enough real forecasts have resolved. Their
// market ids, questions, outcomes and per-model predictions are invented; they do
// NOT correspond to real DreamDEX Event Contracts and must never be presented as
// empirical model performance. Every surface rendering this data is required to
// show SYNTHETIC_BENCHMARK_NOTICE.
//
// Replace with a query over resolved decision receipts once live model forecasts
// have accumulated.
export const SYNTHETIC_BENCHMARK_NOTICE =
  "Demonstration fixture — illustrative scenarios, not resolved DreamDEX contracts. These rankings show how the scoring mechanism works, not measured model performance.";

interface HistoricalBenchmarkEntry {
  marketId: string;
  question: string;
  resolvedOutcome: "YES" | "NO";
  resolvedAt: number;
  marketMidBps: number;
  predictions: Record<ModelId, { probabilityBps: number; confidence: "LOW" | "MEDIUM" | "HIGH" }>;
}

const HISTORICAL_BENCHMARK_DATA: HistoricalBenchmarkEntry[] = [
  {
    marketId: "0x1111-eth-above-3400",
    question: "Will ETH close above $3,400 on Somnia Mainnet launch?",
    resolvedOutcome: "YES",
    resolvedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    marketMidBps: 5800,
    predictions: {
      deterministic: { probabilityBps: 6400, confidence: "HIGH" },
      "gemini-1.5-flash": { probabilityBps: 6700, confidence: "MEDIUM" },
      "deepseek-r1": { probabilityBps: 6900, confidence: "HIGH" },
      "claude-3.5-sonnet": { probabilityBps: 6300, confidence: "HIGH" },
      "ensemble-oracle": { probabilityBps: 6600, confidence: "HIGH" },
    },
  },
  {
    marketId: "0x2222-som-tps-exceed-100k",
    question: "Will Somnia network surpass 100k sustained TPS in Q3?",
    resolvedOutcome: "YES",
    resolvedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    marketMidBps: 6200,
    predictions: {
      deterministic: { probabilityBps: 7100, confidence: "HIGH" },
      "gemini-1.5-flash": { probabilityBps: 7400, confidence: "HIGH" },
      "deepseek-r1": { probabilityBps: 7600, confidence: "HIGH" },
      "claude-3.5-sonnet": { probabilityBps: 6900, confidence: "MEDIUM" },
      "ensemble-oracle": { probabilityBps: 7300, confidence: "HIGH" },
    },
  },
  {
    marketId: "0x3333-btc-dominance-55",
    question: "Will BTC dominance drop below 55% before October?",
    resolvedOutcome: "NO",
    resolvedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    marketMidBps: 4500,
    predictions: {
      deterministic: { probabilityBps: 3800, confidence: "MEDIUM" },
      "gemini-1.5-flash": { probabilityBps: 3200, confidence: "HIGH" },
      "deepseek-r1": { probabilityBps: 2900, confidence: "HIGH" },
      "claude-3.5-sonnet": { probabilityBps: 3500, confidence: "MEDIUM" },
      "ensemble-oracle": { probabilityBps: 3300, confidence: "HIGH" },
    },
  },
  {
    marketId: "0x4444-dreamdex-volume-10m",
    question: "Will DreamDEX 24h event contract volume break $10M?",
    resolvedOutcome: "YES",
    resolvedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    marketMidBps: 5100,
    predictions: {
      deterministic: { probabilityBps: 5900, confidence: "HIGH" },
      "gemini-1.5-flash": { probabilityBps: 6200, confidence: "MEDIUM" },
      "deepseek-r1": { probabilityBps: 6500, confidence: "HIGH" },
      "claude-3.5-sonnet": { probabilityBps: 5800, confidence: "MEDIUM" },
      "ensemble-oracle": { probabilityBps: 6100, confidence: "HIGH" },
    },
  },
  {
    marketId: "0x5555-gas-price-spike",
    question: "Will Somnia Shannon gas price exceed 20 Gwei during test wave?",
    resolvedOutcome: "NO",
    resolvedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    marketMidBps: 4100,
    predictions: {
      deterministic: { probabilityBps: 2800, confidence: "HIGH" },
      "gemini-1.5-flash": { probabilityBps: 2600, confidence: "HIGH" },
      "deepseek-r1": { probabilityBps: 2200, confidence: "HIGH" },
      "claude-3.5-sonnet": { probabilityBps: 3100, confidence: "MEDIUM" },
      "ensemble-oracle": { probabilityBps: 2600, confidence: "HIGH" },
    },
  },
  {
    marketId: "0x6666-somnia-validator-count",
    question: "Will active Somnia validators exceed 150 nodes?",
    resolvedOutcome: "YES",
    resolvedAt: Date.now() - 1000 * 60 * 60 * 12,
    marketMidBps: 6500,
    predictions: {
      deterministic: { probabilityBps: 7800, confidence: "HIGH" },
      "gemini-1.5-flash": { probabilityBps: 7900, confidence: "HIGH" },
      "deepseek-r1": { probabilityBps: 8200, confidence: "HIGH" },
      "claude-3.5-sonnet": { probabilityBps: 7400, confidence: "HIGH" },
      "ensemble-oracle": { probabilityBps: 7800, confidence: "HIGH" },
    },
  },
];

export function getModelArenaRankings(): ModelArenaRanking[] {
  const modelIds: ModelId[] = [
    "ensemble-oracle",
    "deepseek-r1",
    "gemini-1.5-flash",
    "deterministic",
    "claude-3.5-sonnet",
  ];

  const rankings: ModelArenaRanking[] = modelIds.map((id) => {
    const spec = MODEL_SPECS[id];
    let totalBrier = 0;
    let correctCount = 0;
    let marketBrierSum = 0;
    const recentForm: ("WIN" | "LOSS")[] = [];
    const brierTrend: { date: string; brierScoreBps: number }[] = [];

    HISTORICAL_BENCHMARK_DATA.forEach((entry, idx) => {
      const outcomeBps = entry.resolvedOutcome === "YES" ? 10_000 : 0;
      const pred = entry.predictions[id];
      const modelProbBps = pred ? pred.probabilityBps : 5000;

      // Brier score: (prob - outcome)^2
      const delta = modelProbBps - outcomeBps;
      const brierBps = Math.round((delta * delta) / 10_000);
      totalBrier += brierBps;

      // Market baseline Brier score
      const marketDelta = entry.marketMidBps - outcomeBps;
      const marketBrier = Math.round((marketDelta * marketDelta) / 10_000);
      marketBrierSum += marketBrier;

      // Directional correctness (>50% vs outcome)
      const predictedYes = modelProbBps >= 5000;
      const actualYes = entry.resolvedOutcome === "YES";
      const isCorrect = (predictedYes && actualYes) || (!predictedYes && !actualYes);
      if (isCorrect) correctCount++;

      recentForm.push(isCorrect ? "WIN" : "LOSS");

      const dateStr = new Date(entry.resolvedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      brierTrend.push({ date: dateStr, brierScoreBps: brierBps });
    });

    const totalCount = HISTORICAL_BENCHMARK_DATA.length;
    const meanBrierScoreBps = Math.round(totalBrier / totalCount);
    const meanMarketBrierBps = Math.round(marketBrierSum / totalCount);
    const edgeOverMarketBps = Math.max(0, meanMarketBrierBps - meanBrierScoreBps);
    const directionalAccuracyPct = Math.round((correctCount / totalCount) * 100);

    const calibrationErrorPct = parseFloat(((meanBrierScoreBps / 10000) * 100).toFixed(1));
    const calibrationStatus: "HIGHLY_CALIBRATED" | "MODERATE" | "LEARNING" =
      meanBrierScoreBps <= 1500 ? "HIGHLY_CALIBRATED" : meanBrierScoreBps <= 2500 ? "MODERATE" : "LEARNING";

    return {
      rank: 0, // Will sort and assign below
      modelId: id,
      modelName: spec.name,
      family: spec.family,
      provider: spec.provider,
      badgeColor: spec.badgeColor,
      avatarText: spec.avatarText,
      totalPredictions: totalCount,
      meanBrierScoreBps,
      directionalAccuracyPct,
      edgeOverMarketBps,
      calibrationStatus,
      calibrationErrorPct,
      recentForm,
      brierTrend,
    };
  });

  // Sort by lowest Brier score (best calibration), then highest directional accuracy
  rankings.sort((a, b) => {
    if (a.meanBrierScoreBps !== b.meanBrierScoreBps) {
      return a.meanBrierScoreBps - b.meanBrierScoreBps;
    }
    return b.directionalAccuracyPct - a.directionalAccuracyPct;
  });

  rankings.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return rankings;
}

export function getHistoricalBenchmarkList() {
  return HISTORICAL_BENCHMARK_DATA.map((entry) => ({
    marketId: entry.marketId,
    question: entry.question,
    resolvedOutcome: entry.resolvedOutcome,
    resolvedAt: entry.resolvedAt,
    marketMidBps: entry.marketMidBps,
    predictions: entry.predictions,
  }));
}
